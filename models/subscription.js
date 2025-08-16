// models/Subscription.js
const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Subscription = sequelize.define('subscriptions', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  startDate: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  endDate: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  isActive: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  subscriptionId: { // ID от платежной системы
    type: Sequelize.STRING,
    allowNull: true,
  }
});


module.exports = Subscription;