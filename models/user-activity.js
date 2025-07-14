const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const UserActivity = sequelize.define("useractivity", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  actionType: {
    type: Sequelize.ENUM("post_created", "profile_updated", "comment_added"),
    allowNull: false,
  },
  targetId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  targetType: {
    type: Sequelize.ENUM("post", "profile", "comment"),
    allowNull: false,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

module.exports = UserActivity;
