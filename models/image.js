const Sequelize = require('sequelize')
const sequelize = require('../util/database')

const Image = sequelize.define('image', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    filename: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    path: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    size: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    mimetype: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    postId: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
})

module.exports = Image