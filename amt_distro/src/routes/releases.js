const express = require('express');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const {
  listReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease,
} = require('../controllers/releaseController');

const router = express.Router();

router.get('/', authenticateToken, requireRoles('admin', 'artist', 'label'), listReleases);
router.get('/:id', authenticateToken, requireRoles('admin', 'artist', 'label'), getReleaseById);
router.post('/', authenticateToken, requireRoles('admin', 'artist', 'label'), createRelease);
router.patch('/:id', authenticateToken, requireRoles('admin', 'artist', 'label'), updateRelease);
router.delete('/:id', authenticateToken, requireRoles('admin', 'artist', 'label'), deleteRelease);

module.exports = router;
