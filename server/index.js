require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { sequelize } = require('./db');

const authRoutes = require('./routes/auth');
const platesRoutes = require('./routes/plates');
const commentsRoutes = require('./routes/comments');
const usersRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const imagesRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 3010;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5180',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const sessionDir = path.join(__dirname, 'db');
const sessionPath = path.join(sessionDir, 'sessions.sqlite');

app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.sqlite',
      dir: sessionDir,
      concurrentDB: true,
    }),
    secret: process.env.SESSION_SECRET || 'beepcred-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/plates', platesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/images', imagesRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

async function start() {
  // Avoid SQLite alter-table backup churn/crash loops in dev.
  // Schema changes should go through explicit migrations/scripts.
  await sequelize.sync();
  app.listen(PORT, () => {
    console.log(`BeepCred API listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
