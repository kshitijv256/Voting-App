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
        hooks: true,
      });
      Election.belongsTo(models.Admin, {
        foreignKey: "adminId",
        onDelete: "cascade",
        onUpdate: "cascade",
        hooks: true,
      });
    }
  }
  Election.init(
    {
      title: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Election",
      hooks: {
        beforeDestroy: async (election, options) => {
          await sequelize.models.Question.destroy({
            where: { electionId: election.id },
          });
        },
      },
    }
  );
  return Election;
};
