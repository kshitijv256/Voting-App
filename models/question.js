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
      Question.hasMany(models.Answer, {
        foreignKey: "questionId",
        onDelete: "cascade",
        onUpdate: "cascade",
        hooks: true,
      });
      Question.belongsTo(models.Election, {
        foreignKey: "electionId",
        onDelete: "cascade",
        onUpdate: "cascade",
        hooks: true,
      });
    }
  }
  Question.init(
    {
      title: DataTypes.STRING,
      description: DataTypes.STRING,
      selected: DataTypes.INTEGER,
      correct: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Question",
      hooks: {
        beforeDestroy: async (question, options) => {
          await sequelize.models.Answer.destroy({
            where: { questionId: question.id },
          });
        },
      },
    }
  );
  return Question;
};
