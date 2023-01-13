"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Election.hasMany(models.Question, {
        foreignKey: "electionId",
        onDelete: "cascade",
        onUpdate: "cascade",
      });
      Election.hasMany(models.Voter, {
        foreignKey: "electionId",
        onDelete: "cascade",
        onUpdate: "cascade",
      });
      Election.belongsTo(models.Admin, {
        foreignKey: "adminId",
        onDelete: "cascade",
        onUpdate: "cascade",
      });
    }
  }
  Election.init(
    {
      title: DataTypes.STRING,
      description: DataTypes.STRING,
      customURL: DataTypes.STRING,
      state: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Election",
    }
  );
  return Election;
};
