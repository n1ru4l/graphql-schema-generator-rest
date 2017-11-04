/* eslint-disable no-console */
import copyPkg from 'copy-pkg'
import fs from 'fs-extra'
import path from 'path'
import rimraf from 'rimraf'
import pkg from '../package.json'

const rootDir = path.resolve(__dirname, `..`)

console.log(`Delete dist folder`)
rimraf.sync(path.join(rootDir, `dist`))

console.log(`Transform package.json`)
copyPkg.sync(path.join(rootDir, `package.json`), `dist/package.json`, {
  only: [
    `name`,
    `version`,
    `description`,
    `license`,
    `author`,
    `repository`,
    `bugs`,
    `module`,
    `main`,
    `dependencies`,
  ],
})

pkg.files.forEach(file => {
  console.log(`Copy '${file}'`)
  const fileSrcPath = path.join(rootDir, file)
  const fileDestPath = path.join(rootDir, `dist`, file)
  fs.copySync(fileSrcPath, fileDestPath)
})
