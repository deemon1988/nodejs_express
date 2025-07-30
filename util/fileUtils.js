// utils/fileUtils.js

const fs = require("fs");
const path = require("path");

/**
 * Удаляет файл по относительному пути
 * @param {string} relativePath - Путь вроде '/images/posts/photo.jpg'
 */
function deleteFile(relativePath) {
  if (!relativePath) return;

  const fullPath = path.join(__dirname, "..", "public", relativePath);
  fs.unlink(fullPath, (err) => {
    if (err) {
      console.error(`Не удалось удалить файл: ${relativePath}`, err.message);
    } else {
      console.log(`Файл удалён: ${relativePath}`);
    }
  });
}

/**
 * Удаляет несколько файлов (например, галерею)
 * @param {string[]} filePaths - Массив путей вроде ['/images/gallery/1.jpg', ...]
 */
function deleteFiles(filePaths) {
  if (!Array.isArray(filePaths)) return;
  filePaths.forEach(deleteFile);
}

module.exports = {
  deleteFile,
  deleteFiles,
};