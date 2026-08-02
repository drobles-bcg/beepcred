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
  const GarageVehicle = sequelize.define(
    'GarageVehicle',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      nickname: DataTypes.STRING(64),
      year: DataTypes.INTEGER,
      make: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      trim: DataTypes.STRING(128),
      color: DataTypes.STRING(64),
      body_type: {
        type: DataTypes.ENUM(...BODY_TYPES),
        defaultValue: 'other',
      },
      mileage: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      plate_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      plate_state: DataTypes.STRING(2),
      plate_number: DataTypes.STRING(32),
      registration_due_at: DataTypes.DATEONLY,
      favorite_shop_name: DataTypes.STRING(128),
      favorite_shop_phone: DataTypes.STRING(64),
      favorite_shop_address: DataTypes.STRING(255),
      owner_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      /** current = I own this now; former = I owned it before */
      ownership_status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'current',
      },
      owned_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      owned_until: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      notes: DataTypes.TEXT,
    },
    {
      tableName: 'garage_vehicles',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  GarageVehicle.BODY_TYPES = BODY_TYPES;
  GarageVehicle.OWNERSHIP_STATUSES = ['current', 'former'];
  return GarageVehicle;
};
