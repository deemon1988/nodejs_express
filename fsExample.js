const {unlink} = require('node:fs')
const fs = require('fs')
const path = require('path')

const fullPath = path.join(__dirname, '.', 'public', 'images/posts/1753819787683-health-and-sports.png')
console.log(fullPath)

if(fs.existsSync(fullPath)){
  console.log('file exist')
} else {
  console.log('file not exist')
}