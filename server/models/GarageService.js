const { DataTypes } = require('sequelize');

const SERVICE_TYPES = [
  'registration',
  'oil_change',
  'tire_rotation',
  'brake_inspection',
  'emissions',
  'tires',
  'other',
];

module.exports = (sequelize) => {
  const GarageService = sequelize.define(
    'GarageService',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      vehicle_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      service_type: {
        type: DataTypes.ENUM(...SERVICE_TYPES),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      last_done_at: DataTypes.DATEONLY,
      due_at: DataTypes.DATEONLY,
      interval_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notes: DataTypes.TEXT,
    },
    {
      tableName: 'garage_services',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  GarageService.SERVICE_TYPES = SERVICE_TYPES;
  return GarageService;
};
