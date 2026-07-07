const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const releasesRouter = require('./routes/releases');
const healthRouter = require('./routes/health');
const artistsRouter = require('./routes/artists');

const app = express();

const allowlistedOrigins = new Set(env.corsOrigins);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (curl, server-to-server) with no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowlistedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    // Vercel frontend aliases rotate; allow trusted Vercel hosted frontends.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      callback(null, true);
      return;
    }

    // Allow AMT distro custom domains and localhost development origins.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      callback(null, true);
      return;
    }

    if (/^https:\/\/(?:[a-z0-9-]+\.)?amtdistro\.com(?:\.ng)?$/i.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/releases', releasesRouter);
app.use(healthRouter);
app.use(artistsRouter);

app.get('/', (_req, res) => {
  res.json({
    message: 'amt_distro backend is running',
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource id format' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value violates a unique field' });
  }

  return res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;