export default {
  input: `dist/index.js`,
  output: {
    file: `dist/bundle.umd.js`,
    format: `umd`,
  },
  sourcemap: true,
  name: `restLink`,
  exports: `named`,
  onwarn,
}

function onwarn(message) {
  const suppressed = [`UNRESOLVED_IMPORT`, `THIS_IS_UNDEFINED`]

  if (!suppressed.find(code => message.code === code)) {
    // eslint-disable-next-line no-console
    return console.warn(message.message)
  }
}
