require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('./index.js');
const { DataTypes } = require('sequelize');

async function migrate() {
  try {
    await sequelize.sync();

    const qi = sequelize.getQueryInterface();
    const plates = await qi.describeTable('license_plates');
    if (!plates.display_plate_text) {
      await qi.addColumn('license_plates', 'display_plate_text', {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
      console.log('Added column: license_plates.display_plate_text');
    }

    const images = await qi.describeTable('plate_images');
    if (!images.ocr_plate_text) {
      await qi.addColumn('plate_images', 'ocr_plate_text', {
        type: DataTypes.STRING(32),
        allowNull: true,
      });
      console.log('Added column: plate_images.ocr_plate_text');
    }
    if (!images.ocr_confidence) {
      await qi.addColumn('plate_images', 'ocr_confidence', {
        type: DataTypes.FLOAT,
        allowNull: true,
      });
      console.log('Added column: plate_images.ocr_confidence');
    }
    if (!images.ai_vision_payload) {
      await qi.addColumn('plate_images', 'ai_vision_payload', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('Added column: plate_images.ai_vision_payload');
    }
    if (!images.ai_vision_at) {
      await qi.addColumn('plate_images', 'ai_vision_at', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('Added column: plate_images.ai_vision_at');
    }

    console.log('Database migration checks complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
