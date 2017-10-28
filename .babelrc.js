'use strict'

module.exports = {
  presets: [
    [
      'env',
      {
        targets: {
          node: 'current',
        },
        modules: (process.NODE_ENV = `BUILD` ? false : undefined),
      },
    ],
  ],
  plugins: [
    ['transform-object-rest-spread', { useBuiltIns: true }],
    `transform-export-extensions`,
  ],
}
