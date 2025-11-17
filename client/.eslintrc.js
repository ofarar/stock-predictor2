// client/.eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true
  },
  globals: {
    process: 'readonly'
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/prop-types': 'off'
  },
  overrides: [
    {
      files: ['.eslintrc.js', '*.config.js'],
      env: {
        node: true
      }
    }
  ]
};