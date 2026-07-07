const express = require('express');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/usersController');

const router = express.Router();

router.post('/', createUser);
router.get('/', authenticateToken, requireRoles('admin'), listUsers);
router.get('/me', authenticateToken, (req, res, next) => {
  req.params.id = req.user.userId;
  return getUserById(req, res, next);
});
router.get('/:id', authenticateToken, requireRoles('admin'), getUserById);
router.patch('/:id', authenticateToken, requireRoles('admin'), updateUser);
router.delete('/:id', authenticateToken, requireRoles('admin'), deleteUser);

module.exports = router;
