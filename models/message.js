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
    status: {
        type: Sequelize.ENUM('new', 'in_progress', 'replied', 'closed'),
        defaultValue: 'new'
    },
    repliedAt: Sequelize.DATE
});

module.exports = Message