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

    if (!plates.plate_types) {
      await qi.addColumn('license_plates', 'plate_types', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('Added column: license_plates.plate_types');
    }

    const users = await qi.describeTable('users');
    if (!users.google_id) {
      await qi.addColumn('users', 'google_id', {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
      console.log('Added column: users.google_id');
    }
    try {
      await sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id) WHERE google_id IS NOT NULL'
      );
      console.log('Ensured unique index: users_google_id_unique');
    } catch (e) {
      // SQLite without partial indexes: try plain unique index (multiple NULLs ok in SQLite UNIQUE)
      try {
        await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id)');
        console.log('Ensured unique index: users_google_id_unique');
      } catch (e2) {
        console.warn('Could not create google_id unique index:', e2.message);
      }
    }

    console.log('Database migration checks complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
