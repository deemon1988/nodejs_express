const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const Post = sequelize.define("post", {
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
    allowNull: false,
  },
  likes: {
    type: Sequelize.INTEGER,
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
   image: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  gallery: {
    type: Sequelize.JSON,
    allowNull: true,
  },
});

module.exports = Post;

