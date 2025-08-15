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
  status: {
    type: Sequelize.ENUM('pending', 'succeeded', 'canceled', 'waiting_for_capture'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentId: { // ID от платежной системы
    type: Sequelize.STRING,
    allowNull: true,
  },
});


module.exports = Payment;