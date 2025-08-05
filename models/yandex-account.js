const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const YandexAccount = sequelize.define("yandexAccount", {
    yandexId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, // ID от Яндекса (uid)
    },
    login: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    client_id: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    display_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    real_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    first_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    last_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    default_email: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    birthday: {
        type: Sequelize.STRING,
        allowNull: false,
    },
})

module.exports = YandexAccount