const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      display_name: DataTypes.STRING(128),
      bio: DataTypes.TEXT,
      avatar_url: DataTypes.STRING(512),
      role: {
        type: DataTypes.ENUM('user', 'moderator', 'admin'),
        defaultValue: 'user',
      },
      is_banned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      cred_score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      post_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      comment_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      last_active_at: DataTypes.DATE,
      votes_visible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,
    }
  );

  return User;
};
