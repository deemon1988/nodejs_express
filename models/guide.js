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
      pdfFile: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });

module.exports = Guide