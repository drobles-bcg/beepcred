const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImageVote = sequelize.define(
    'ImageVote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      image_id: {
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
      tableName: 'image_votes',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return ImageVote;
};
