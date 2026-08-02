const { DataTypes } = require('sequelize');

const BODY_TYPES = [
  'sedan',
  'suv',
  'truck',
  'coupe',
  'convertible',
  'minivan',
  'wagon',
  'hatchback',
  'van',
  'other',
];

module.exports = (sequelize) => {
  const LicensePlate = sequelize.define(
    'LicensePlate',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plate_number: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      // Optional user-facing text (may include symbols/emoji).
      display_plate_text: DataTypes.STRING(64),
      state: {
        type: DataTypes.STRING(2),
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING(8),
        defaultValue: 'US',
      },
      slug: {
        type: DataTypes.STRING(128),
        unique: true,
      },
      make: DataTypes.STRING(128),
      model: DataTypes.STRING(128),
      year: DataTypes.INTEGER,
      color: DataTypes.STRING(64),
      body_type: {
        type: DataTypes.ENUM(...BODY_TYPES),
        defaultValue: 'other',
      },
      primary_image_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      cred_score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      plus_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      minus_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      view_count: {
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
      first_seen_at: DataTypes.DATE,
      last_seen_at: DataTypes.DATE,
    },
    {
      tableName: 'license_plates',
      underscored: true,
      timestamps: true,
    }
  );

  LicensePlate.BODY_TYPES = BODY_TYPES;
  return LicensePlate;
};
