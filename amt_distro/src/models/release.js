const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artist',
      required: true,
      index: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    releaseType: {
      type: String,
      enum: ['single', 'ep', 'album', 'compilation', 'remix'],
      default: 'single',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewing', 'approved', 'released', 'rejected'],
      default: 'draft',
    },
    primaryGenre: {
      type: String,
      trim: true,
      default: '',
    },
    language: {
      type: String,
      trim: true,
      default: '',
    },
    coverArtUrl: {
      type: String,
      trim: true,
      default: '',
    },
    releaseDate: {
      type: Date,
      default: null,
    },
    trackCount: {
      type: Number,
      min: 0,
      default: 1,
    },
    labelName: {
      type: String,
      trim: true,
      default: '',
    },
    upc: {
      type: String,
      trim: true,
      default: '',
    },
    explicit: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

releaseSchema.index({ title: 1, artistId: 1 });

module.exports = mongoose.model('Release', releaseSchema);
