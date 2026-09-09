const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function harness() {
  let saved
  const authStorage = { getUser: () => null, getToken: () => null, setSession: (value) => { saved = value }, clear: () => { saved = undefined } }
  const source = fs.readFileSync(path.join(__dirname, '../src/store/authSlice.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const load = (name) => name === '@/lib/authStorage' ? { authStorage } : name === '@/lib/authApi' ? { authApi: {} } : require(name)
  vm.runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(load, module, module.exports)
  return { ...module.exports, saved: () => saved }
}
const user = { id: 'admin-a', organizationId: 'tenant-a', role: 'admin', name: 'Updated name', email: 'updated@example.com' }

test('saved profile persists and stale JWT restore cannot revert its display fields', () => {
  const h = harness()
  let state = h.default(undefined, h.setCredentials({ token: 'session-a', user }))
  assert.equal(h.saved().user.email, user.email)
  state = h.default(state, h.restoreSessionThunk.fulfilled({ ...user, name: 'Old name', email: 'old@example.com' }, 'restore'))
  assert.equal(state.user.name, user.name)
  assert.equal(state.user.email, user.email)
})

test('logout then employee login replaces all previous account profile fields', () => {
  const h = harness()
  let state = h.default(undefined, h.setCredentials({ token: 'session-a', user }))
  state = h.default(state, h.logoutThunk.fulfilled(undefined, 'logout'))
  assert.equal(state.user, null)
  assert.equal(state.token, null)
  const employee = { id: 'employee-b', organizationId: 'tenant-b', role: 'employee', name: 'Employee', email: 'employee@example.com' }
  state = h.default(state, h.loginThunk.fulfilled({ token: 'session-b', user: employee }, 'login'))
  assert.equal(state.user.email, employee.email)
  assert.equal(h.saved().user.id, employee.id)
})

test('restore never merges display fields across users or tenants', () => {
  for (const changes of [{ id: 'other-user' }, { organizationId: 'other-tenant' }]) {
    const h = harness()
    let state = h.default(undefined, h.setCredentials({ token: 'session-a', user }))
    state = h.default(state, h.restoreSessionThunk.fulfilled({ ...user, ...changes, name: 'Other', email: 'other@example.com' }, 'restore'))
    assert.equal(state.user.email, 'other@example.com')
  }
})
