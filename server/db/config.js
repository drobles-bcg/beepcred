const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, 'database.sqlite'),
    logging: false,
  },
};
