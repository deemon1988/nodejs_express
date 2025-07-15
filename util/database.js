require("dotenv").config();

const Sequelize = require("sequelize");

const sequelize = new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
  dialect: "postgresql",
  host: process.env.PGHOST,
});

module.exports = sequelize






