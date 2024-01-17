module.exports = {
  root: true,
  parser: '@typescript-eslint/parser', // for parsing Typescript code
  extends: [
    'airbnb',
    'airbnb/hooks', // to use airbnb set of rules
  ],
  rules: {
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'import/no-import-module-exports': 'off',
    'import/prefer-default-export': 'off',
    'no-underscore-dangle': 'off',
  }, // our own set of customized rules
  settings: {
    'import/resolver': {
      'babel-module': {},
    },
  },
};
