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
        allowNull: true,
    },
    real_name: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    first_name: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    last_name: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    default_email: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    birthday: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    default_avatar_id: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    is_avatar_empty: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
})

module.exports = YandexAccount