const { DataTypes } = require('sequelize');

const REASON_TAGS = [
  'cool_plate',
  'funny_plate',
  'nice_car',
  'polite_driver',
  'good_parker',
  'helpful',
  'bad_parking',
  'speeding',
  'cut_off',
  'aggressive',
  'blocking',
  'tailgating',
  'phone_driving',
  'ran_light',
];

module.exports = (sequelize) => {
  const PlateVote = sequelize.define(
    'PlateVote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plate_id: {
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
      reason_tag: {
        type: DataTypes.ENUM(...REASON_TAGS),
        allowNull: true,
      },
    },
    {
      tableName: 'plate_votes',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  PlateVote.REASON_TAGS = REASON_TAGS;
  PlateVote.POSITIVE_TAGS = REASON_TAGS.slice(0, 6);
  PlateVote.NEGATIVE_TAGS = REASON_TAGS.slice(6);
  return PlateVote;
};
