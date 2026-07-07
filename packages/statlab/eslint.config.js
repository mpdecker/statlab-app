import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['src/**/*.test.js', 'src/methods/__fixtures__/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'error',
      'no-debugger': 'error',
    },
  },
]
