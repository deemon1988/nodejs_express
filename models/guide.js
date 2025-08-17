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
  accessType: {
    type: Sequelize.ENUM("free", "paid", "subscription"),
    allowNull: false,
    defaultValue: "free", // значение по умолчанию
  },
  price: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
  }
});

// Связь с изображениями
Guide.prototype.getImages = function() {
    return Image.findAll({
        where: {
            entityId: this.id,
            entityType: 'guide'
        }
    })
}

module.exports = Guide