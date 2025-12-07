module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'node',
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
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
