module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@school/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^exceljs$': '<rootDir>/test/__mocks__/esm-stub.js',
    '^mammoth$': '<rootDir>/test/__mocks__/esm-stub.js',
  },
};
