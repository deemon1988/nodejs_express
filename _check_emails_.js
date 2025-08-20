require('dotenv').config();
const Imap = require('imap')

const imap = new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    tls: true,


})


imap.once('ready', function () {
    imap.openBox('TheEverythingJournal', false, function (err, box) {
        if (err) {
            console.log('Ошибка при открытии папки «Входящие»:', err);
        } else {
            console.log('Открыта папка:', box.name);
        }
    });
});

imap.once('error', function (err) { console.log('Ошибка IMAP:', err); });
imap.once('end', function () { console.log('Соединение разорвано'); });
imap.connect();