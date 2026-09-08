const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function harness() {
  let auth = { token: 'audit-session-a', status: 'authenticated', user: { id: 'admin-a', organizationId: 'tenant-a', role: 'admin' } }
  let subscriber
  const calls = [], invalidations = []
  const cache = {}
  const mocks = {
    'react-redux': { useSelector: (select) => select({ auth }) },
    '@tanstack/react-query': { useQuery: (options) => options, useMutation: (options) => options, useQueryClient: () => ({ invalidateQueries: async (options) => invalidations.push(options) }) },
    sonner: { toast: { success() {}, error() {} } },
    '@/store': { store: { getState: () => ({ auth }), subscribe: (fn) => { subscriber = fn } } },
    '@/lib/assetApi': { assetApi: {} },
    '@/lib/apiClient': { default: { get: async (...args) => { calls.push(args); return { data: { success: true, data: [] } } } } },
  }
  function load(name) {
    if (mocks[name]) return mocks[name]
    if (cache[name]) return cache[name].exports
    const source = fs.readFileSync(path.join(__dirname, '../src', name.replace('@/', '') + '.ts'), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    cache[name] = module
    vm.runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(load, module, module.exports)
    return module.exports
  }
  return { load, calls, invalidations, auth: () => auth, setAuth: (next) => { auth = next; subscriber?.() } }
}
const plain = (value) => JSON.parse(JSON.stringify(value))
const record = (overrides = {}) => ({ _id: 'log-a', organizationId: 'tenant-a', actorEmail: 'admin@example.com', actorRole: 'admin', action: 'UPDATE Asset', eventType: 'Asset.UPDATE', resourceType: 'Asset', resourceId: 'asset-a', outcome: 'Success', createdAt: '2026-09-08T10:00:00Z', ...overrides })
const filters = { search: '', outcome: '', resourceType: '', actorRole: '' }

test('audit uses only the supported GET endpoint with cancellation and no filter parameters', async () => {
  const h = harness()
  const query = h.load('@/hooks/useAuditLogs').useAuditLogs()
  const signal = new AbortController().signal
  await query.queryFn({ signal })
  assert.equal(h.calls[0][0], '/audit-logs')
  assert.equal(h.calls[0][1].signal, signal)
  assert.deepEqual(Object.keys(h.calls[0][1]), ['signal'])
  assert.equal(query.gcTime, 0)
  assert.equal(query.retry, false)
})

test('audit keys isolate users, tenants, roles, and repeated login sessions', () => {
  const h = harness()
  const audit = h.load('@/hooks/useAuditLogs')
  const original = h.auth()
  const key = audit.useAuditLogs().queryKey
  for (const user of [{ ...original.user, id: 'admin-b' }, { ...original.user, organizationId: 'tenant-b' }, { ...original.user, role: 'employee' }]) {
    h.setAuth({ ...original, user })
    assert.notDeepEqual(plain(audit.useAuditLogs().queryKey), plain(key))
  }
  assert.equal(audit.useAuditLogs().enabled, false)
  h.setAuth({ token: null, user: null, status: 'unauthenticated' })
  assert.equal(audit.useAuditLogs().enabled, false)
  h.setAuth(original)
  assert.notDeepEqual(plain(audit.useAuditLogs().queryKey), plain(key))
  assert.equal(audit.useAuditLogs(false).enabled, false)
  assert.ok(!JSON.stringify(key).includes(original.token))
})

test('asset history selects only matching Asset records from the shared audit cache', async () => {
  const h = harness()
  const assets = h.load('@/hooks/useAssets')
  const audit = h.load('@/hooks/useAuditLogs')
  const query = assets.useAssetAudit('asset-a')
  assert.deepEqual(plain(query.queryKey), plain(audit.useAuditLogs().queryKey))
  const records = [record(), record({ _id: 'other-asset', resourceId: 'asset-b' }), record({ _id: 'other-type', resourceType: 'Incident' })]
  assert.deepEqual(plain(query.select(records)).map((item) => item._id), ['log-a'])
  assert.equal(assets.useAssetAudit('').enabled, false)
  await assets.useUpdateAsset().onSuccess({ _id: 'asset-a', assetId: 'AST-1' })
  assert.ok(h.invalidations.some((item) => item.exact && JSON.stringify(item.queryKey) === JSON.stringify(query.queryKey)))
})

test('local search covers each supported field, combines filters, and sorts without mutating cached records', () => {
  const { filterAuditRecords } = harness().load('@/lib/auditView')
  const records = [record(), record({ _id: 'new', outcome: 'Failure', actorRole: 'employee', createdAt: '2026-09-09T10:00:00Z' })]
  const before = JSON.stringify(records)
  assert.deepEqual(plain(filterAuditRecords(records, filters)).map((item) => item._id), ['new', 'log-a'])
  for (const search of [' ADMIN@EXAMPLE.COM ', 'UPDATE Asset', 'Asset.UPDATE', 'Asset', 'asset-a']) {
    assert.equal(filterAuditRecords(records, { ...filters, search }).length, 2)
  }
  assert.deepEqual(plain(filterAuditRecords(records, { ...filters, outcome: 'Failure', actorRole: 'employee', resourceType: 'Asset' })).map((item) => item._id), ['new'])
  assert.equal(filterAuditRecords(records, { ...filters, search: 'missing' }).length, 0)
  assert.equal(JSON.stringify(records), before)
})

test('missing actor fields, null/nested metadata, and invalid timestamps do not break filtering', () => {
  const { filterAuditRecords, formatAuditTimestamp } = harness().load('@/lib/auditView')
  const records = [record({ actorEmail: null, actorRole: null, resourceId: null, metadata: null }), record({ _id: 'nested', createdAt: 'invalid', metadata: { nested: [null, '<script>not executable</script>', { value: false }] } })]
  assert.equal(filterAuditRecords(records, filters).length, 2)
  assert.equal(formatAuditTimestamp('invalid'), 'Timestamp unavailable')
  assert.equal(records[0].metadata, null)
  assert.equal(records[1].metadata.nested[1], '<script>not executable</script>')
})
