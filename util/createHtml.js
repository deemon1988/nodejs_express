const fs = require('fs');
const path = require('path');


// Путь и имя файла
// const filePath =  path.resolve(__dirname,'./views/blog/category/New3template.ejs');
// const templatePath = path.resolve(__dirname, './views/blog/category/template.ejs');


// createOrRenameHtmlFile(filePath, 'New4template.ejs', templatePath)

/**
 * Переименовывает HTML-файл или создаёт новый на основе шаблона
 * @param {string} filePath - Путь к файлу, который нужно переименовать (может не существовать)
 * @param {string} newFileName - Новое имя файла (например, 'index.html')
 * @param {string} templatePath - Путь к HTML-файлу-шаблону (обязательно должен существовать)
 * @returns {Promise<string>} - Путь к итоговому файлу
 */
function createOrRenameHtmlFile(filePath, newFileName, templatePath) {
    return new Promise((resolve, reject) => {
        const directory = path.dirname(filePath);
        const newFilePath = path.join(directory, newFileName);

        // Проверяем, существует ли шаблон
        if (!fs.existsSync(templatePath)) {
            return reject(new Error(`Файл-шаблон не найден: ${templatePath}`));
        }

        // Читаем содержимое шаблона
        fs.readFile(templatePath, 'utf8', (err, content) => {
            if (err) {
                return reject(new Error(`Ошибка чтения шаблона: ${err.message}`));
            }

            const currentExists = fs.existsSync(filePath);

            if (currentExists) {
                // Если файл существует — просто переименовываем
                fs.rename(filePath, newFilePath, (err) => {
                    if (err) {
                        return reject(new Error(`Не удалось переименовать файл: ${err.message}`));
                    }
                    console.log(`Файл переименован: ${filePath} → ${newFilePath}`);
                    resolve(newFilePath);
                });
            } else {
                // Если файла нет — создаём новый на основе шаблона
                fs.writeFile(newFilePath, content, 'utf8', (err) => {
                    if (err) {
                        return reject(new Error(`Не удалось создать файл: ${err.message}`));
                    }
                    console.log(`Файл создан из шаблона: ${newFilePath}`);
                    resolve(newFilePath);
                });
            }
        });
    });
}

module.exports = createOrRenameHtmlFile;