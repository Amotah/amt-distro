const express = require('express');
const {
  listArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
} = require('../controllers/artistController');

const router = express.Router();

router.get('/artists', listArtists);
router.get('/artists/:id', getArtistById);
router.post('/artists', createArtist);
router.put('/artists/:id', updateArtist);
router.delete('/artists/:id', deleteArtist);

module.exports = router;
