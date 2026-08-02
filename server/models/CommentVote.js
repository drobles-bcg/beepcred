const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommentVote = sequelize.define(
    'CommentVote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      comment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      vote: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
    },
    {
      tableName: 'comment_votes',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return CommentVote;
};
