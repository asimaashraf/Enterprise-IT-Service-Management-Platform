const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Execute the actual API/hook modules with isolated transport, store, and query
// adapters. No credentials, running backend, browser, or new test packages needed.
function harness() {
  let auth = { token: 'session-a', status: 'authenticated', user: { id: 'admin-a', organizationId: 'tenant-a', role: 'admin' } }
  let subscriber
  const calls = [], invalidations = [], toasts = []
  const store = { getState: () => ({ auth }), subscribe: (fn) => { subscriber = fn } }
  const transport = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map((method) => [method, async (...args) => {
    calls.push({ method, args })
    return { data: { success: true, data: [] } }
  }]))
  const mocks = {
    'react-redux': { useSelector: (select) => select({ auth }) },
    '@tanstack/react-query': {
      useQuery: (options) => options,
      useMutation: (options) => options,
      useQueryClient: () => ({ invalidateQueries: async (options) => { invalidations.push(options) } }),
    },
    sonner: { toast: { success: (message) => toasts.push(message), error: (message) => toasts.push(message) } },
    axios: { isAxiosError: (error) => error?.isAxiosError === true },
    '@/store': { store },
    '@/lib/apiClient': { default: transport },
  }
  const cache = {}
  function load(name) {
    if (mocks[name]) return mocks[name]
    if (cache[name]) return cache[name].exports
    const file = path.join(__dirname, '../src', name.replace('@/', '') + '.ts')
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    cache[name] = module
    vm.runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(load, module, module.exports)
    return module.exports
  }
  return { load, calls, invalidations, toasts, setAuth: (next) => { auth = next; subscriber?.() }, auth: () => auth }
}
const plain = (value) => JSON.parse(JSON.stringify(value))

test('profile and team API payloads exclude role, tenant, and system fields', async () => {
  const h = harness()
  await h.load('@/lib/userApi').userApi.updateProfile('user-a', { name: ' Ada ', email: ' ADA@Example.com ', role: 'admin', organizationId: 'other', password: 'not-sent', isActive: false })
  assert.deepEqual(plain(h.calls[0].args), ['/users/user-a', { name: 'Ada', email: 'ada@example.com' }])
  const teams = h.load('@/lib/supportTeamApi').supportTeamApi
  await teams.create({ name: 'Ops', members: ['admin-a'], organizationId: 'other', isActive: false })
  await teams.update('team-a', { name: 'Ops', members: [], isActive: false, organizationId: 'other', _id: 'other' })
  assert.deepEqual(plain(h.calls[1].args[1]), { name: 'Ops', members: ['admin-a'] })
  assert.deepEqual(plain(h.calls[2].args[1]), { name: 'Ops', members: [], isActive: false })
})

test('directory keys change across role, tenant, and same-account relogin; employee queries are disabled', () => {
  const h = harness()
  const users = h.load('@/hooks/useUsers')
  const eligible = h.load('@/hooks/useEligibleOperationalAssignees')
  const teams = h.load('@/hooks/useSupportTeams')
  const first = users.useUsers().queryKey
  const original = h.auth()
  h.setAuth({ ...original, user: { ...original.user, role: 'employee' } })
  assert.equal(users.useUsers().enabled, false)
  assert.equal(eligible.useEligibleOperationalAssignees(true).enabled, false)
  assert.equal(teams.useSupportTeams().enabled, false)
  assert.notDeepEqual(plain(users.useUsers().queryKey), plain(first))
  h.setAuth({ token: null, user: null, status: 'unauthenticated' })
  h.setAuth(original)
  assert.notDeepEqual(plain(users.useUsers().queryKey), plain(first))
  const second = users.useUsers().queryKey
  h.setAuth({ ...original, user: { ...original.user, organizationId: 'tenant-b' } })
  assert.notDeepEqual(plain(users.useUsers().queryKey), plain(second))
  assert.ok(!JSON.stringify(first).includes(original.token))
})

test('user refresh precisely invalidates directory and operational candidates, including RCA shared data', async () => {
  const h = harness()
  const users = h.load('@/hooks/useUsers')
  await users.useInvalidateUsers()()
  assert.deepEqual(h.invalidations.map((item) => plain(item.queryKey.slice(-2))), [['users', 'list'], ['users', 'eligible-assignees']])
  assert.ok(h.invalidations.every((item) => item.exact))
  const signal = new AbortController().signal
  await users.useUsers().queryFn({ signal })
  assert.equal(h.calls[0].args[1].signal, signal)
})

test('team mutations refresh both teams and eligible assignees; 409 keeps success callback untouched', async () => {
  const h = harness()
  const teams = h.load('@/hooks/useSupportTeams')
  let closed = false
  const mutation = teams.useDeleteSupportTeam(() => { closed = true })
  const message = 'This support team is referenced by an escalation policy and cannot be deleted.'
  mutation.onError({ isAxiosError: true, response: { status: 409, data: { message } } })
  assert.equal(closed, false)
  assert.equal(h.toasts[0], message)
  assert.equal(h.invalidations.length, 0)
  await mutation.onSuccess()
  assert.equal(closed, true)
  assert.deepEqual(h.invalidations.map((item) => plain(item.queryKey.slice(-2))), [['support-teams', 'list'], ['users', 'eligible-assignees']])
})

test('old session mutations cannot dispatch or invalidate the next session', async () => {
  const h = harness()
  const mutation = h.load('@/hooks/useSupportTeams').useUpdateSupportTeam()
  const invalidate = h.load('@/hooks/useUsers').useInvalidateUsers()
  h.setAuth({ ...h.auth(), token: 'session-b' })
  assert.throws(() => mutation.mutationFn({ id: 'team-a', payload: { isActive: false } }), /session changed/)
  await mutation.onSuccess()
  mutation.onError(new Error('old request failed'))
  await invalidate()
  assert.equal(h.calls.length, 0)
  assert.equal(h.invalidations.length, 0)
  assert.equal(h.toasts.length, 0)
})
