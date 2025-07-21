const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Category = sequelize.define("category", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
    len: {
      args: [2, 100], // минимальная и максимальная длина
      msg: "Name must be between 2 and 100 characters",
    },
  },
  tagline: {
    type: Sequelize.STRING(100),
    allowNull: true,
    len: {
      args: [0, 100], // минимальная и максимальная длина
      msg: "Tagline must be between 0 and 100 characters",
    },
  },
  description: {
    type: Sequelize.STRING(500),
    allowNull: true,
    len: {
      args: [0, 500], // минимальная и максимальная длина
      msg: "Description must be between 0 and 500 characters",
    },
  },
  image: {
    type: Sequelize.STRING(500),
    allowNull: true,
  },
});

module.exports = Category;
