const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Alias = sequelize.define("alias", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    len: {
      args: [2, 30], // минимальная и максимальная длина
      msg: "Alias must be between 2 and 30 characters",
    },
  },
})

module.exports = Alias;