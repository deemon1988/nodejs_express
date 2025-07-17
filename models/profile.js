const Sequelize = require('sequelize')
const sequelize = require('../util/database')

const Profile = sequelize.define('profile', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    firstname: {
        type: Sequelize.STRING,
        allowNull: false,
    },
     lastname: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    // role: {
    //     type: Sequelize.STRING,
    //     allowNull: false,
    // },
    avatar: {
        type: Sequelize.STRING,
        allowNull: true,
    },
})

module.exports = Profile