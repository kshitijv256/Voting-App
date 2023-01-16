"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Voter.belongsTo(models.Election, {
        foreignKey: "electionId",
        onDelete: "cascade",
        onUpdate: "cascade",
      });
      // define association here
    }
  }
  Voter.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      voterID: DataTypes.STRING,
      password: DataTypes.STRING,
      voted: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Voter",
    }
  );
  return Voter;
};
