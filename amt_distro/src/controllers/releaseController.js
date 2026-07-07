const Release = require('../models/release');
const { notifyActivity } = require('../services/activityNotificationService');

function getOwnerFilter(req) {
  if (req.user.role === 'admin') {
    return {};
  }

  return { ownerUserId: req.user.userId };
}

async function listReleases(req, res, next) {
  try {
    const releases = await Release.find(getOwnerFilter(req))
      .populate('artistId', 'displayName ownerUserId active verified')
      .populate('ownerUserId', 'fullName email role status')
      .sort({ createdAt: -1 });

    return res.status(200).json(releases);
  } catch (error) {
    return next(error);
  }
}

async function getReleaseById(req, res, next) {
  try {
    const release = await Release.findById(req.params.id)
      .populate('artistId', 'displayName ownerUserId active verified')
      .populate('ownerUserId', 'fullName email role status');

    if (!release) {
      return res.status(404).json({ message: 'Release not found' });
    }

    if (req.user.role !== 'admin' && release.ownerUserId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You do not have permission to access this release' });
    }

    return res.status(200).json(release);
  } catch (error) {
    return next(error);
  }
}

async function createRelease(req, res, next) {
  try {
    const release = await Release.create({
      ...req.body,
      ownerUserId: req.user.role === 'admin' && req.body.ownerUserId ? req.body.ownerUserId : req.user.userId,
    });

    const populatedRelease = await release.populate([
      { path: 'artistId', select: 'displayName ownerUserId active verified' },
      { path: 'ownerUserId', select: 'fullName email role status' },
    ]);

    void notifyActivity({
      actor: req.user,
      action: 'created a release',
      target: {
        type: 'release',
        name: populatedRelease.title,
        id: populatedRelease._id,
      },
      summary: `Created release ${populatedRelease.title}.`,
      details: [
        `Artist: ${populatedRelease.artistId?.displayName || 'Unassigned'}`,
        `Status: ${populatedRelease.status || 'unknown'}`,
      ],
    });

    return res.status(201).json(populatedRelease);
  } catch (error) {
    return next(error);
  }
}

async function updateRelease(req, res, next) {
  try {
    const release = await Release.findById(req.params.id);

    if (!release) {
      return res.status(404).json({ message: 'Release not found' });
    }

    if (req.user.role !== 'admin' && release.ownerUserId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You do not have permission to update this release' });
    }

    const fields = [
      'title',
      'artistId',
      'releaseType',
      'status',
      'primaryGenre',
      'language',
      'coverArtUrl',
      'releaseDate',
      'trackCount',
      'labelName',
      'upc',
      'explicit',
      'notes',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        release[field] = req.body[field];
      }
    });

    await release.save();

    const populatedRelease = await release.populate([
      { path: 'artistId', select: 'displayName ownerUserId active verified' },
      { path: 'ownerUserId', select: 'fullName email role status' },
    ]);

    void notifyActivity({
      actor: req.user,
      action: 'updated a release',
      target: {
        type: 'release',
        name: populatedRelease.title,
        id: populatedRelease._id,
      },
      summary: `Updated release ${populatedRelease.title}.`,
      details: [
        `Artist: ${populatedRelease.artistId?.displayName || 'Unassigned'}`,
        `Status: ${populatedRelease.status || 'unknown'}`,
      ],
    });

    return res.status(200).json(populatedRelease);
  } catch (error) {
    return next(error);
  }
}

async function deleteRelease(req, res, next) {
  try {
    const release = await Release.findById(req.params.id);

    if (!release) {
      return res.status(404).json({ message: 'Release not found' });
    }

    if (req.user.role !== 'admin' && release.ownerUserId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this release' });
    }

    void notifyActivity({
      actor: req.user,
      action: 'deleted a release',
      target: {
        type: 'release',
        name: release.title,
        id: release._id,
      },
      summary: `Deleted release ${release.title}.`,
    });

    await release.deleteOne();
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease,
};
