// Generate route metadata from TypeScript syntax, never by importing the app or
// connecting to its databases. Runtime consumes only the generated JSON.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const parse = (file) => ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
const walk = (node, fn) => { fn(node); ts.forEachChild(node, (child) => walk(child, fn)) }
function imports(source) {
  const result = new Map()
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) || !node.importClause) continue
    const file = path.resolve(path.dirname(source.fileName), node.moduleSpecifier.text + '.ts')
    if (node.importClause.name) result.set(node.importClause.name.text, { file })
    const bindings = node.importClause.namedBindings
    if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements)
      result.set(item.name.text, { file, name: (item.propertyName || item.name).text })
  }
  return result
}
function controllerInfo(location) {
  if (!location || !fs.existsSync(location.file)) throw new Error('Missing controller source')
  const source = parse(location.file)
  let handler
  walk(source, (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText(source) === location.name) handler = n.initializer
    if (ts.isFunctionDeclaration(n) && n.name?.text === location.name) handler = n
  })
  if (!handler) throw new Error('Missing handler: ' + location.name)
  const statuses = new Set(), queries = new Set()
  walk(handler, (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'status' && n.arguments[0] && ts.isNumericLiteral(n.arguments[0])) statuses.add(Number(n.arguments[0].text))
    if (ts.isPropertyAccessExpression(n) && n.expression.getText(source) === 'req.query') queries.add(n.name.text)
    if (ts.isVariableDeclaration(n) && n.initializer?.getText(source) === 'req.query' && ts.isObjectBindingPattern(n.name))
      for (const element of n.name.elements) queries.add((element.propertyName || element.name).getText(source))
  })
  return { statuses: [...statuses].sort(), queries: [...queries].sort() }
}
function generate() {
  const app = parse(path.join(root, 'src/app.ts')), appImports = imports(app), routes = []
  walk(app, (node) => {
    if (!ts.isCallExpression(node) || node.expression.getText(app) !== 'app.use') return
    const [prefix, ...args] = node.arguments
    if (!prefix || !ts.isStringLiteral(prefix) || !prefix.text.startsWith('/api/v1/')) return
    const routeArg = args.find((arg) => appImports.get(arg.getText(app))?.file.endsWith('.routes.ts'))
    if (!routeArg) throw new Error('Unrecognized API mount: ' + prefix.text)
    const source = parse(appImports.get(routeArg.getText(app)).file), refs = imports(source)
    let inheritedAuth = false, inheritedAdmin = false
    for (const stmt of source.statements) {
      if (!ts.isExpressionStatement(stmt) || !ts.isCallExpression(stmt.expression)) continue
      const call = stmt.expression, verb = call.expression.getText(source).replace('router.', '')
      if (verb === 'use') {
        inheritedAuth ||= call.arguments.some((a) => a.getText(source) === 'authenticate')
        inheritedAdmin ||= call.arguments.some((a) => a.getText(source) === 'authorize("admin")')
        continue
      }
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(verb)) continue
      const [route, ...handlers] = call.arguments
      if (!ts.isStringLiteral(route)) throw new Error('Unsupported route syntax')
      const handler = handlers.at(-1).getText(source)
      const fullPath = prefix.text + (route.text === '/' ? '' : route.text)
      routes.push({ method: verb, path: fullPath, authenticated: inheritedAuth || handlers.some((a) => a.getText(source) === 'authenticate'), admin: inheritedAdmin || handlers.some((a) => /^authorize\(["']admin["']\)$/.test(a.getText(source))), handler, ...controllerInfo(refs.get(handler)) })
    }
  })
  return routes
}
function render(routes) { return '[\n' + routes.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n]\n' }
if (require.main === module) {
  const output = path.join(root, 'src/docs/routes.generated.json'), content = render(generate())
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(output, 'utf8') !== content) throw new Error('Route metadata changed: run npm run docs:generate')
  } else fs.writeFileSync(output, content)
  console.log('OpenAPI route inventory: ' + generate().length + ' operations')
}
module.exports = { generate, render }
