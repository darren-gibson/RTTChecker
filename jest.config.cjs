module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
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
