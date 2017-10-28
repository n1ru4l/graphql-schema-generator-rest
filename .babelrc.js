'use strict'

module.exports = {
  presets: [
    [
      'env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  plugins: [
    ['transform-object-rest-spread', { useBuiltIns: true }],
    `transform-export-extensions`,
  ],
}
