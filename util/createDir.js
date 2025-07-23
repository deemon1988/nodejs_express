// utils/fileUtils.js
const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Директория создана: ${dirPath}`);
  }
};

module.exports = { ensureDirectoryExists };