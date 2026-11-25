module.exports = {
  forbidden: [
    {
      name: 'core-no-adapters',
      severity: 'error',
      comment: 'Το core δεν import-άρει από adapters ή features.',
      from: { path: '^src/core' },
      to: { path: '^src/(adapters|features)' }
    },
    {
      name: 'core-no-node-builtins',
      severity: 'error',
      comment: 'Το core δεν χρησιμοποιεί Node builtins.',
      from: { path: '^src/core' },
      to: { dependencyTypes: ['core'] }
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Κυκλικές εξαρτήσεις απαγορεύονται.',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: { extensions: ['.js', '.mjs'] }
  }
};
