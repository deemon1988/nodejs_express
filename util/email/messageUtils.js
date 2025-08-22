const sequelize = require("../database");
async function getThreadedMessages(page, limit, messagesStatus) {
    try {
        let whereClause = `"status" != 'adminReply'`
        if(messagesStatus){
            whereClause += ` AND "status" = :messagesStatus`
        }

        const offset = (page - 1) * limit
        const rows = await sequelize.query(`
            SELECT * FROM (
                SELECT DISTINCT ON ("threadId") *
                FROM "messages"
                WHERE ${whereClause}
                ORDER BY "threadId", "createdAt" DESC
            ) as latest_messages
            ORDER BY "createdAt" DESC
            LIMIT :limit OFFSET :offset
            `,
            {
                replacements: {
                    limit: parseInt(limit) || 10,
                    offset: parseInt(offset) || 0,
                    messagesStatus: messagesStatus
                },
                type: sequelize.QueryTypes.SELECT
            }
        );

        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) FROM (
            SELECT DISTINCT ON ("threadId") "threadId"
            FROM "messages"
            WHERE ${whereClause}
            ORDER BY "threadId", "createdAt" DESC
            ) as latest_messages
            `, {
                replacements: {
                    messagesStatus: messagesStatus
                }
            })

        const total = parseInt(countResult[0].count)
        const totalPages = Math.ceil(total / limit)

        return {
            messages: rows,
            currentPage: page,
            hasNextPage: (page * limit) < total,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            totalPages: totalPages
        }

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