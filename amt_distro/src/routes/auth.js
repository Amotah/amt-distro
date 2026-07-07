const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { login, me, register } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);

module.exports = router;
