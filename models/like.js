const Sequelize = require('sequelize')
const sequelize = require('../util/database')

const Like = sequelize.define('like', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    isLiked: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
    }
})

module.exports = Like