const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      alias: 'name',
      trim: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    genres: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },
    socialLinks: {
      type: {
        instagram: { type: String, trim: true, default: '' },
        tiktok: { type: String, trim: true, default: '' },
        youtube: { type: String, trim: true, default: '' },
        spotify: { type: String, trim: true, default: '' },
        website: { type: String, trim: true, default: '' },
      },
      default: () => ({}),
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

artistSchema.index({ displayName: 1 });

module.exports = mongoose.model('Artist', artistSchema);
