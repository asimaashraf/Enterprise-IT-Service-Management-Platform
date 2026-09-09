module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/observability.test.ts'],
  // No database fixtures: these tests exercise HTTP instrumentation and schema
  // generation in isolation. The ordinary integration configuration is unchanged.
}
