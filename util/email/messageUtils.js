const sequelize = require("../database");

async function getThreadedMessages(page = 1, limit = 10) {
    try {
        return await sequelize.query(`
            SELECT DISTINCT ON ("threadId") *
            FROM "messages"
            ORDER BY "threadId", "createdAt" DESC
            `);

    } catch (error) {
        console.error('Error getting threaded messages:', error);
        throw error;
    }
}

module.exports = { getThreadedMessages }