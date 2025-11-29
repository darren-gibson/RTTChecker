module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js']
  ,
  coverageThreshold: {
    global: {
      branches: 68,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/logger.js': {
      branches: 65,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    './src/RTTBridge.js': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/MatterDevice.js': {
      branches: 80,
      functions: 80,
      lines: 90,
      statements: 90,
    },
  }
};
