/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {
    // Allow .js extension imports (ES modules)
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
};
