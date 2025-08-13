// utils/fileUtils.js

const fs = require("fs").promises;
const path = require("path");

/**
 * Удаляет файл по относительному пути
 * @param {string} relativePath - Путь вроде '/images/posts/photo.jpg'
 */
async function deleteFile(relativePath) {
   if (!relativePath) {
    return { success: false, message: 'Путь к файлу не указан' };
  }

  const fullPath = path.join(__dirname, "..", "public", relativePath);
 try {
    await fs.unlink(fullPath);
    console.log(`Файл удалён: ${relativePath}`);
    return {success: true, message: `Файл удалён`}
  } catch (err) {
    console.error(`Не удалось удалить файл: ${relativePath}`, err.message);
    return {success: false, message: err.message}
    // throw new Error(err);
  }
}

/**
 * Удаляет несколько файлов (например, галерею)
 * @param {string[]} filePaths - Массив путей вроде ['/images/gallery/1.jpg', ...]
 */
function deleteFiles(filePaths) {
  if (!Array.isArray(filePaths)) return;
  filePaths.forEach((filePath) => {
    // Убираем протокол и домен, если есть
    const parsedPath = filePath.replace(/^https?:\/\/[^\/]+/, "");
    deleteFile(parsedPath);
  });
}

module.exports = {
  deleteFile,
  deleteFiles,
};