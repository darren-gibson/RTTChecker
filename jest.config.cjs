module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Use 75% of available CPU cores for parallel test execution
  maxWorkers: '75%',
  // Enable caching for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        // Disable type-checking during tests (TSC already does this)
        isolatedModules: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'node',
        },
        diagnostics: {
          ignoreCodes: [4112], // Ignore "cannot have override modifier" error in jest
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  testMatch: ['**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 25,
      lines: 40,
      statements: 40,
    },
    // Logger and device wiring are infrastructure concerns; avoid blocking
    // local runs on their coverage while still tracking them globally.
  },
};
