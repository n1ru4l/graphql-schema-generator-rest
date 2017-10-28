import babel from 'rollup-plugin-babel'

export default {
  input: `src/index.js`,
  output: {
    file: `dist/module.js`,
    format: `es`,
  },
  sourceMap: true,
  moduleName: `apolloRestLink`,
  exports: `named`,
  onwarn,
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
  ],
}

function onwarn(message) {
  const suppressed = [`UNRESOLVED_IMPORT`, `THIS_IS_UNDEFINED`]

  if (!suppressed.find(code => message.code === code)) {
    // eslint-disable-next-line no-console
    return console.warn(message.message)
  }
}
