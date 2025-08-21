const sequelize = require("../database");

async function getThreadedMessages(page = 1, limit = 10) {
    try {
        return await sequelize.query(`
            SELECT * FROM (
                SELECT DISTINCT ON ("threadId") *
                FROM "messages"
                WHERE "status" != 'adminReply'
                ORDER BY "threadId", "createdAt" DESC
            ) as latest_messages
             ORDER BY "createdAt" DESC
            `);

    } catch (error) {
        console.error('Error getting threaded messages:', error);
        throw error;
    }
}

function buildMessagesThree(messages) {
    const messageMap = {}
    const three = []

    messages.forEach(message => {
        messageMap[message.id] = {
            ...message.toJSON(),
            children: [],
            level: 0
        }
    })

    messages.forEach(message => {
        if (message.parentId) {
            // const level = messageMap[message.parentId].level + 1;
            // messageMap[message.id].level = Math.min(level, 5);
            messageMap[message.parentId].children.push(messageMap[message.id])
        } else {
            // messageMap[message.id].level = 0;
            three.push(messageMap[message.id])
        }
    })
    return three
}

// Добавьте это в ваш контроллер после получения threadMessages
function addParentInfo(threadMessages) {
    return threadMessages.map(message => {
        const parent = message.parentId
            ? threadMessages.find(m => m.id === message.parentId)
            : null;

        return {
            ...message.toJSON(),
            parent: parent ? {
                id: parent.id,
                firstname: parent.firstname,
                lastname: parent.lastname,
                content: parent.content.substring(0, 50) + '...',
                createdAt: parent.createdAt
            } : null
        };
    });
}

module.exports = { getThreadedMessages, buildMessagesThree, addParentInfo }