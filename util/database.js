require("dotenv").config();

const Sequelize = require("sequelize");

const sequelize = new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
  dialect: "postgresql",
  host: process.env.PGHOST,
});

module.exports = sequelize;

// const { Pool } = require("pg");

// const pool = new Pool({
//   user: process.env.PGUSER,
//   host: process.env.PGHOST,
//   database: process.env.PGDATABASE,
//   password: process.env.PGPASSWORD,
//   port: process.env.PGPORT,
// });

// module.exports = {
//     query: (text, params) => pool.query(text, params)
// }
