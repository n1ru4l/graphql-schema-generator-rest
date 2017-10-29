'use strict'

module.exports = {
  presets: [
    [
      'env',
      {
        targets: {
          node: 'current',
          // browsers: 'last 2 versions',
        },
        modules: process.env.NODE_ENV === `test` ? undefined : false,
      },
    ],
  ],
  plugins: [
    `transform-export-extensions`,
    ['transform-object-rest-spread', { useBuiltIns: true }],
  ],
}
