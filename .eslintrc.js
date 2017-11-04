module.exports = {
  parser: `babel-eslint`,
  plugins: [`prettier`],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: `eslint:recommended`,
  parserOptions: {
    sourceType: `module`,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
}
