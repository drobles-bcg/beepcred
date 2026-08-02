const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define(
    'Report',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reported_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      content_type: {
        type: DataTypes.ENUM('plate', 'image', 'comment', 'user'),
        allowNull: false,
      },
      content_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.ENUM('spam', 'harassment', 'false_info', 'inappropriate', 'other'),
        allowNull: false,
      },
      notes: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'dismissed', 'actioned'),
        defaultValue: 'pending',
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: DataTypes.DATE,
    },
    {
      tableName: 'reports',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return Report;
};
