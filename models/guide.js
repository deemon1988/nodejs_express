const Sequelize = require('sequelize')
const sequelize = require('../util/database')

const Guide = sequelize.define('guides', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  preview: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  image: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  cover: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  fileUrl: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  fileSize: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  fileType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  contentType: {
    type: Sequelize.ENUM("free", "paid", "subscription"),
    allowNull: false,
    defaultValue: "free", // значение по умолчанию
  },

});

module.exports = Guide