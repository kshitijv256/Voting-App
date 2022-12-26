"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Question.belongsTo(models.Election, { foreignKey: "electionId" });

      Question.hasMany(models.Answer, { foreignKey: "questionId" });
    }
  }
  Question.init(
    {
      body: DataTypes.STRING,
      selected: DataTypes.INTEGER,
      correct: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Question",
    }
  );
  return Question;
};
