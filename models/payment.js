// models/Payment.js
const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Payment = sequelize.define('payments', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  amount: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'RUB'
  },
  status: {
    type: Sequelize.ENUM('pending', 'waiting_for_capture', 'succeeded', 'canceled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentId: { // ID от YooKassa
    type: Sequelize.STRING,
    allowNull: true,
  },
  subscriptionId: { // ID подписки
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  plan: {
    type: Sequelize.ENUM('monthly', 'annual'),
    allowNull: false,
  },
  metadata: {
    type: Sequelize.JSON,
    allowNull: true,
  }
});

// const Payment = sequelize.define('payments', {
//   id: {
//     type: Sequelize.INTEGER,
//     autoIncrement: true,
//     allowNull: false,
//     primaryKey: true,
//   },
//   amount: {
//     type: Sequelize.DECIMAL(10, 2),
//     allowNull: false,
//   },
//   status: {
//     type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
//     allowNull: false,
//     defaultValue: 'pending'
//   },
//   paymentId: { // ID от платежной системы
//     type: Sequelize.STRING,
//     allowNull: true,
//   }
// });


module.exports = Payment;