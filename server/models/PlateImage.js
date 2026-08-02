const { DataTypes } = require('sequelize');

const SHOT_TYPES = ['plate', 'front', 'rear', 'side', 'interior', 'other'];

module.exports = (sequelize) => {
  const PlateImage = sequelize.define(
    'PlateImage',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plate_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'license_plates', key: 'id' },
        onDelete: 'CASCADE',
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      image_url: DataTypes.STRING(512),
      thumbnail_url: DataTypes.STRING(512),
      original_filename: DataTypes.STRING(255),
      file_size_bytes: DataTypes.INTEGER,
      width: DataTypes.INTEGER,
      height: DataTypes.INTEGER,
      caption: DataTypes.STRING(512),
      is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      cred_score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      shot_type: {
        type: DataTypes.ENUM(...SHOT_TYPES),
        defaultValue: 'plate',
      },
      latitude: DataTypes.DECIMAL(10, 8),
      longitude: DataTypes.DECIMAL(11, 8),
      city: DataTypes.STRING(128),
      state_location: DataTypes.STRING(64),
      /** Best-effort OCR from upload (Sharp + tesseract.js) */
      ocr_plate_text: DataTypes.STRING(32),
      ocr_confidence: DataTypes.FLOAT,
      /** Cached OpenAI vision JSON (plate read, vehicle guess, vanity interpretation) */
      ai_vision_payload: DataTypes.TEXT,
      ai_vision_at: DataTypes.DATE,
      uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'plate_images',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  PlateImage.SHOT_TYPES = SHOT_TYPES;
  return PlateImage;
};
