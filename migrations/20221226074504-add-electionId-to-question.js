'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Questions', 'electionId', {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addConstraint('Questions', {
      fields: ['electionId'],
      type: 'foreign key',
      references: {
        table: 'Elections',
        field: 'id',
      },
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Questions', 'electionId');
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
