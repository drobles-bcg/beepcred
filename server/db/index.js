const { Sequelize } = require('sequelize');
const config = require('./config.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: dbConfig.logging,
});

const User = require('../models/User')(sequelize);
const LicensePlate = require('../models/LicensePlate')(sequelize);
const PlateImage = require('../models/PlateImage')(sequelize);
const PlateVote = require('../models/PlateVote')(sequelize);
const Comment = require('../models/Comment')(sequelize);
const CommentVote = require('../models/CommentVote')(sequelize);
const ImageVote = require('../models/ImageVote')(sequelize);
const Report = require('../models/Report')(sequelize);
const GarageVehicle = require('../models/GarageVehicle')(sequelize);
const GarageService = require('../models/GarageService')(sequelize);

// Associations
User.hasMany(PlateImage, { foreignKey: 'uploaded_by', as: 'uploadedImages' });
PlateImage.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

User.hasMany(PlateVote, { foreignKey: 'user_id', as: 'plateVotes' });
PlateVote.belongsTo(User, { foreignKey: 'user_id', as: 'voter' });

User.hasMany(CommentVote, { foreignKey: 'user_id', as: 'commentVotes' });
CommentVote.belongsTo(User, { foreignKey: 'user_id', as: 'voter' });

User.hasMany(ImageVote, { foreignKey: 'user_id', as: 'imageVotes' });
ImageVote.belongsTo(User, { foreignKey: 'user_id', as: 'voter' });

User.hasMany(Report, { foreignKey: 'reported_by', as: 'reportsSubmitted' });
Report.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

User.hasMany(GarageVehicle, { foreignKey: 'user_id', as: 'garageVehicles' });
GarageVehicle.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

GarageVehicle.hasMany(GarageService, { foreignKey: 'vehicle_id', as: 'services' });
GarageService.belongsTo(GarageVehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

GarageVehicle.belongsTo(LicensePlate, { foreignKey: 'plate_id', as: 'plate' });
LicensePlate.hasMany(GarageVehicle, { foreignKey: 'plate_id', as: 'garageLinks' });

LicensePlate.hasMany(PlateImage, { foreignKey: 'plate_id', as: 'images' });
PlateImage.belongsTo(LicensePlate, { foreignKey: 'plate_id', as: 'plate' });

LicensePlate.hasMany(PlateVote, { foreignKey: 'plate_id', as: 'votes' });
PlateVote.belongsTo(LicensePlate, { foreignKey: 'plate_id', as: 'plate' });

LicensePlate.hasMany(Comment, { foreignKey: 'plate_id', as: 'comments' });
Comment.belongsTo(LicensePlate, { foreignKey: 'plate_id', as: 'plate' });

Comment.hasMany(Comment, { foreignKey: 'parent_id', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parent_id', as: 'parent' });

Comment.hasMany(CommentVote, { foreignKey: 'comment_id', as: 'votes' });
CommentVote.belongsTo(Comment, { foreignKey: 'comment_id', as: 'comment' });

PlateImage.hasMany(ImageVote, { foreignKey: 'image_id', as: 'votes' });
ImageVote.belongsTo(PlateImage, { foreignKey: 'image_id', as: 'image' });

LicensePlate.belongsTo(PlateImage, {
  foreignKey: 'primary_image_id',
  as: 'primaryImage',
});

module.exports = {
  sequelize,
  User,
  LicensePlate,
  PlateImage,
  PlateVote,
  Comment,
  CommentVote,
  ImageVote,
  Report,
  GarageVehicle,
  GarageService,
};
