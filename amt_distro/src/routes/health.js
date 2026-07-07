const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.get('/db-health', (_req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    database: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
