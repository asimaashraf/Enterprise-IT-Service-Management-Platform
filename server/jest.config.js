module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ["<rootDir>/tests"],

  moduleFileExtensions: ["ts", "js"],

  setupFiles: ["<rootDir>/tests/jest.env.ts"],

  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
};