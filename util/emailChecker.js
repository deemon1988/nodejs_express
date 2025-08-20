// utils/emailChecker.js
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const Message = require('../models/message');
const sequelize = require('./database');

class YandexEmailChecker {
    constructor() {
        this.imap = new Imap({
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: 'imap.yandex.ru',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });
    }

    async checkEmails() {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', () => {
                this.imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Поиск непрочитанных сообщений
                    this.imap.search(['UNSEEN'], (err, uids) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (uids.length === 0) {
                            console.log('Нет непрочитанных сообщений');
                            // Возвращаем объект с информацией
                            const result = {
                                success: true,
                                message: 'Нет непрочитанных сообщений',
                                unreadCount: 0,
                                emails: []
                            };
                            this.imap.end();
                            resolve(result);
                            return;
                        }

                        console.log(`Найдено ${uids.length} непрочитанных сообщений`);

                        const fetch = this.imap.fetch(uids, {
                            bodies: '',
                            struct: true
                        });

                        const emails = [];
                        let processedCount = 0;
                        const totalMessages = uids.length;
                        let newMessages = 0

                        fetch.on('message', (msg, seqno) => {
                            let buffer = '';

                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });

                                stream.once('end', async () => {
                                    try {
                                        const parsed = await simpleParser(buffer);
                                        const messageResult = await this.processEmail(parsed, seqno);
                                        console.log('messageResult ----', messageResult)

                                        if (messageResult.newMessage) newMessages++
                                        console.log('messageResult.newMessage ----', messageResult.newMessage)
                                        msg.once('attributes', (attrs) => {
                                            this.imap.addFlags(attrs.uid, '\\Seen', (err) => {
                                                if (err) {
                                                    console.error('Ошибка при пометке сообщения:', err);
                                                }
                                            });
                                        });

                                        processedCount++;
                                        if (processedCount === totalMessages) {
                                            const result = {
                                                success: true,
                                                message: `Найдено ${newMessages} непрочитанных сообщений`,
                                                unreadCount: uids.length,
                                                emails: emails
                                            };
                                            this.imap.end();
                                            resolve(result);
                                        }

                                    } catch (error) {
                                        console.error('Ошибка парсинга сообщения:', error);
                                        processedCount++;
                                        if (processedCount === totalMessages) {
                                            this.imap.end();
                                            resolve();
                                        }
                                    }
                                });
                            });
                        });

                        fetch.once('error', (err) => {
                            console.error('Ошибка fetch:', err);
                            reject(err);
                        });
                    });
                });
            });

            this.imap.once('error', reject);
            this.imap.connect();
        });
    }

    async processEmail(parsed, seqno) {
        try {
            console.log('=== Новое сообщение ===');
            console.log('От:', parsed.from.text);
            console.log('Кому:', parsed.to.text);
            console.log('Тема:', parsed.subject);
            console.log('Дата:', parsed.date);
            console.log('Message-ID:', parsed.messageId);
            console.log('====================');

            let replyTo = parsed.inReplyTo || parsed.references;
            // Проверяем на дубликаты
            const messageId = parsed.messageId || '';
            if (messageId) {
                const existingMessage = await Message.findOne({
                    where: { messageId: messageId }
                });

                if (existingMessage) {
                    console.log('Сообщение с таким Message-ID уже существует, пропускаем. ID:', existingMessage.id);
                    return { newMessage: false }
                }
            }

            // Сообщение отправленное из приложения
            if (parsed.from.value[0].address === process.env.EMAIL_USER && parsed.from.value[0].name === 'The Everything Journal') {
                const userData = this.extractUserDataFromContent(parsed.text || parsed.html || '')
                const content = this.extractContentWithRegex(parsed.html)
                const threadId = await checkThreadId(replyTo, messageId)
                const createdMessage = await parsedAndCreateMessageFromClient(userData, content, parsed, messageId, threadId)
                if (createdMessage) console.log('Сообщение от пользователя с сайта сохранено');
                return { newMessage: true }
            }

            // Сообщение отправленное из почтового клиента
            if (parsed.to.value[0].address === process.env.EMAIL_USER && parsed.to.value[0].name === 'The Everything Journal') {
                // Определяем, является ли это ответом
                const isReply = !!(parsed.inReplyTo || parsed.references);
                const replyTo = parsed.inReplyTo || parsed.references
                let threadId;
                if (!replyTo) {
                    // New thread - use own messageId as threadId
                    threadId = messageId;
                } else {
                    // Reply - find the parent message's threadId
                    const parentMessage = await Message.findOne({
                        where: {
                            messageId: replyTo, // Look for the message we're replying to
                        },
                        attributes: ['threadId']
                    });

                    if (parentMessage) {
                        threadId = parentMessage.threadId;
                    } else {
                        // Fallback: use own messageId if parent not found
                        threadId = messageId;
                    }
                }

                const content = getFirstMessageBlock(parsed.html)
                let parentId = null
                if (isReply) {
                    const repliedId = parsed.inReplyTo || parsed.references
                    parentId = await Message.findOne({ where: { messageId: repliedId }, attributes: ['id'] })
                }
                const message = await Message.create({
                    firstname: parsed.from.value[0].name.split(' ')[0],
                    lastname: parsed.from.value[0].name.split(' ')[1],
                    email: parsed.from.value[0].address,
                    content: content,
                    subject: parsed.subject,
                    status: isReply ? 'userReply' : 'new',
                    replyTo: replyTo,
                    messageId: messageId,
                    parentId: parentId.id,
                    threadId: threadId,
                    isReply: isReply,
                    receivedAt: parsed.date || new Date(),

                });
                console.log('Сообщение сохранено');
                return { newMessage: true }
            }


            const uniqueEmails = await Message.findAll({
                attributes: [
                    [sequelize.fn('DISTINCT', sequelize.col('email')), 'email']
                ],
                raw: true
            });
            // Преобразуем в массив строк
            const emailArray = uniqueEmails.map(item => item.email);

            if (parsed.from.value[0].name !== 'The Everything Journal') {
                if (!emailArray.includes(parsed.from.value[0].address)) {
                    console.log('Сообщение не от посетителя сайта:', parsed.from.value[0].address);
                    return { newMessage: false }
                }
                console.log('Сообщение не относится к сайту:', parsed.from.value[0].address);
                return { newMessage: false }
            }


        } catch (error) {
            console.error('Ошибка обработки email:', error);
            throw error;
        }
    }



    extractUserDataFromContent(content) {
        const userData = {
            email: '',
            firstname: '',
            lastname: ''
        };

        if (!content) return userData;

        // Ищем email в формате "Email: user@example.com"
        const emailMatch = content.match(/Email:\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i);
        if (emailMatch) {
            userData.email = emailMatch[1].trim();
        }

        // Ищем имя в формате "Имя: любые символы до конца строки или перевода строки"
        const nameMatch = content.match(/Имя:\s*([^\n\r]+)/i);
        if (nameMatch) {
            userData.firstname = nameMatch[1].trim();
        }

        // Ищем фамилию в формате "Фамилия: любые символы до конца строки или перевода строки"
        const lastNameMatch = content.match(/Фамилия:\s*([^\n\r]+)/i);
        if (lastNameMatch) {
            userData.lastname = lastNameMatch[1].trim();
        }


        return userData;
    }

    extractContentWithRegex(html) {
        console.log(html)
        // Ищем содержимое между тегами <p> после заголовка "Содержимое письма:"
        const contentRegex = /<h3[^>]*>Содержимое письма:<\/h3>\s*<p[^>]*>(.*?)<\/p>/s;
        const match = html.match(contentRegex);

        if (match && match[1]) {
            // Удаляем HTML теги из результата
            return match[1].replace(/<[^>]*>/g, '');
        }

        return '';
    }


    async sendAdminNotification(message) {
        try {
            console.log('Уведомление администратору отправлено о сообщении ID:', message.id);
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
}


async function checkThreadId(replyTo, messageId) {
    let threadId;
    if (!replyTo) {
        // New thread - use own messageId as threadId
        threadId = messageId;
    } else {
        // Reply - find the parent message to get its threadId
        try {
            const parentMessage = await Message.findOne({
                where: {
                    messageId: replyTo, // Look for the message we're replying to
                },
                attributes: ['threadId']
            });

            if (parentMessage && parentMessage.threadId) {
                threadId = parentMessage.threadId;
            } else {
                // If parent message not found, create new thread
                threadId = messageId;
            }
        } catch (error) {
            console.error('Error finding parent message:', error);
            // Fallback to creating new thread
            threadId = messageId;
        }
    }

    return threadId
}

async function parsedAndCreateMessageFromClient(userData, content, parsed, messageId, threadId) {

    const isReply = !!(parsed.inReplyTo || parsed.references);
    let parentId = null
    if (isReply) {
        const repliedId = parsed.inReplyTo || parsed.references
        parentId = await Message.findOne({ where: { messageId: repliedId }, attributes: ['id'] })

    }

    const message = await Message.create({
        firstname: userData.firstname,
        lastname: userData.lastname,
        email: userData.email,
        content: content,
        subject: parsed.subject,
        status: 'new',
        isReply: isReply,
        messageId: messageId,
        parentId: parentId.id,
        threadId: threadId,
        receivedAt: parsed.date || new Date(),
        replyTo: parsed.inReplyTo || parsed.references
    });
    return message
}

const cheerio = require('cheerio');
const { Op } = require('sequelize');

function getFirstMessageBlock(html) {
    const $ = cheerio.load(html);

    // Находим первый div с реальным содержимым (не пустой и не содержащий только br)
    const firstDiv = $('div').first();
    const firstText = firstDiv.text().trim();

    // Если первый div содержит реальный текст
    if (firstText && firstText !== '<br />' && firstText.length > 1) {
        return firstText;
    }

    return '';
}



module.exports = YandexEmailChecker;