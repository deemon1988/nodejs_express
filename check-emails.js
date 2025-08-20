// test-email-checker.js
const YandexEmailChecker = require('./util/emailChecker');

async function test() {
    try {
        console.log('Запуск проверки email...');
        const checker = new YandexEmailChecker();
        await checker.checkEmails();
        console.log('Проверка завершена успешно!');
        
        // Завершаем процесс
        process.exit(0);
        
    } catch (error) {
        console.error('Ошибка при проверке email:', error);
        process.exit(1);
    }
}

module.exports = { test }
// test();