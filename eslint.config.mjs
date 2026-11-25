export default [
  {
    files: ['src/core/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-restricted-globals': ['error',
        { name: 'window', message: 'Το core δεν αγγίζει window.' },
        { name: 'document', message: 'Το core δεν αγγίζει DOM.' },
        { name: 'navigator', message: 'Το core δεν αγγίζει navigator.' },
        { name: 'localStorage', message: 'Χρησιμοποίησε storage adapter.' },
        { name: 'indexedDB', message: 'Χρησιμοποίησε storage adapter.' },
        { name: 'performance', message: 'Injected time μόνο.' },
        { name: 'alert', message: 'Το core δεν κάνει UI.' }
      ],
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'Injected time: πάρε now ως όρισμα.' }
      ]
    }
  }
];
