// const nodemailer = require("nodemailer");
// const ejs = require('ejs');
// const path = require('path');
// require("dotenv").config();

// // Путь к файлу шаблона
// const templatePath = path.join(__dirname, './views/email-template.ejs');

// console.log(templatePath)

// // Данные для шаблона
// const emailData = {
//     name: 'UserName',
//     orderNumber: '12345',
//     unsubscribeLink: 'https://example.com/unsubscribe?token=abc123xyz'
// };

// // Рендеринг шаблона из файла
// const html = ejs.renderFile(templatePath, emailData, (err, html) => {
//     if (err) {
//         console.error('Ошибка рендеринга шаблона:', err);
//         return;
//     }
//     // console.log(html);
// });



// // Создаем транспорт для подключения к SMTP Яндекса
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: true, // использовать SSL
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS, // или пароль приложения
//   },
// });

// // Настройки письма
// const mailOptions = {
//   from: {
//     name: "Дмитрий",
//     address: "dmn72835@yandex.ru",
//   },
//   replyTo: 'deemn72835@yandex.ru',
//   to: "test-fj5nq1jd3@srv1.mail-tester.com",
//   subject: "Тестовое письмо",
//   html: html,
// };

// // Отправляем письмо
// transporter.sendMail(mailOptions, (error, info) => {
//   if (error) {
//     console.log("Ошибка отправки:", error);
//   } else {
//     console.log("Письмо отправлено:", info.messageId);
//   }
// });

const nodemailer = require("nodemailer");
const ejs = require('ejs');
const path = require('path');
require("dotenv").config();


// Создаем транспорт для подключения к SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Рендеринг EJS шаблона
 * @param {string} templatePath - Путь к файлу шаблона
 * @param {Object} data - Данные для шаблона
 * @returns {Promise<string>} HTML контент
 */
async function renderTemplate(templatePath, data) {
  try {
    const html = await ejs.renderFile(templatePath, data);
    return html;
  } catch (err) {
    console.error('Ошибка рендеринга шаблона:', err);
    throw err;
  }
}

/**
 * Отправка email
 * @param {Object} mailOptions - Опции письма
 * @returns {Promise<Object>} Информация об отправке
 */
async function sendEmail(mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.log("Ошибка отправки:", error);
    throw error;
  }
}

/**
 * Отправка email с использованием EJS шаблона
 * @param {string} templatePath - Путь к файлу шаблона
 * @param {Object} templateData - Данные для шаблона
 * @param {Object} mailOptions - Дополнительные опции письма
 * @returns {Promise<Object>} Информация об отправке
 */
async function sendTemplateEmail(templatePath, templateData, mailOptions = {}) {
  try {
    // Рендерим шаблон
    const html = await renderTemplate(templatePath, templateData);
    
    // Объединяем опции письма с HTML контентом
    const fullMailOptions = {
      from: {
        name: "The Everything Journal",
        address: process.env.EMAIL_USER,
      },
      replyTo: process.env.EMAIL_USER,
      ...mailOptions,
      html: html,
    };

    // Отправляем письмо
    const info = await sendEmail(fullMailOptions);
    return info;
  } catch (error) {
    console.error('Ошибка отправки шаблонного письма:', error);
    throw error;
  }
}

module.exports = {
  renderTemplate,
  sendEmail,
  sendTemplateEmail,
  transporter
};