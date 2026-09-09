// Run in Node after building: the validator has ESM dependencies which the
// repository's CommonJS Jest runtime does not load. No network refs are allowed.
const parser = require('@apidevtools/swagger-parser')
const document = require('../dist/src/docs/openapi').openApiDocument
parser.validate(JSON.parse(JSON.stringify(document)), { resolve: { external: false } })
  .then(() => console.log('OpenAPI 3.0 validation passed'))
  .catch((error) => { console.error(error.message); process.exitCode = 1 })
