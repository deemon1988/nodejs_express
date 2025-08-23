// models/Message.js
const Sequelize = require('sequelize')
const sequelize = require('../util/database')

const Message = sequelize.define('message', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    firstname: Sequelize.STRING,
    lastname: Sequelize.STRING,
    email: Sequelize.STRING,
    content: Sequelize.TEXT,
    contentSanitized: {
        type: Sequelize.TEXT, // очищенный HTML
        allowNull: true,
    },
    subject: Sequelize.STRING,
    status: {
        type: Sequelize.ENUM('new', 'in_progress', 'replied', 'closed', 'userReply', 'adminReply'),
        defaultValue: 'new'
    },
    repliedAt: Sequelize.DATE,
    replyTo: Sequelize.STRING,
    messageId: Sequelize.STRING,
    threadId: Sequelize.STRING,
    isReply: Sequelize.BOOLEAN,
    receivedAt: Sequelize.DATE,
    parentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
            model: 'messages',
            key: 'id'
        }
    }

});

// Ассоциации
Message.hasMany(Message, {
    as: 'replies',
    foreignKey: 'parentId'
});

Message.belongsTo(Message, {
    as: 'parent',
    foreignKey: 'parentId'
});

module.exports = Message