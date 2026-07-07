const Artist = require('../models/artist');
const { notifyActivity } = require('../services/activityNotificationService');

async function listArtists(_req, res, next) {
  try {
    const artists = await Artist.find()
      .populate('ownerUserId', 'fullName email role status')
      .sort({ createdAt: -1 });
    res.status(200).json(artists);
  } catch (error) {
    next(error);
  }
}

async function getArtistById(req, res, next) {
  try {
    const artist = await Artist.findById(req.params.id).populate('ownerUserId', 'fullName email role status');

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    return res.status(200).json(artist);
  } catch (error) {
    return next(error);
  }
}

async function createArtist(req, res, next) {
  try {
    const artist = await Artist.create(req.body);
    void notifyActivity({
      actor: req.user,
      action: 'created an artist',
      target: {
        type: 'artist',
        name: artist.displayName,
        id: artist._id,
      },
      summary: `Created artist profile ${artist.displayName}.`,
    });
    res.status(201).json(artist);
  } catch (error) {
    next(error);
  }
}

async function updateArtist(req, res, next) {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    void notifyActivity({
      actor: req.user,
      action: 'updated an artist',
      target: {
        type: 'artist',
        name: artist.displayName,
        id: artist._id,
      },
      summary: `Updated artist profile ${artist.displayName}.`,
    });

    return res.status(200).json(artist);
  } catch (error) {
    return next(error);
  }
}

async function deleteArtist(req, res, next) {
  try {
    const artist = await Artist.findByIdAndDelete(req.params.id);

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    void notifyActivity({
      actor: req.user,
      action: 'deleted an artist',
      target: {
        type: 'artist',
        name: artist.displayName,
        id: artist._id,
      },
      summary: `Deleted artist profile ${artist.displayName}.`,
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
};
