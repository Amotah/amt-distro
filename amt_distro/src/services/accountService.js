const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/user');
const { getDashboardPathForRole } = require('../utils/dashboard-path');

function normalizeRole(role) {
  if (role === 'label' || role === 'artist') {
    return role;
  }

  return 'artist';
}

function serializeUser(user) {
  const plainUser = user.toObject ? user.toObject() : user;

  return {
    ...plainUser,
    dashboardPath: getDashboardPathForRole(plainUser.role),
  };
}

function buildAuthPayload(user, token) {
  const serializedUser = serializeUser(user);

  return {
    token,
    dashboardPath: serializedUser.dashboardPath,
    user: serializedUser,
  };
}

function issueToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}

async function createAccount(input) {
  const user = await User.create({
    fullName: input.fullName,
    email: input.email,
    passwordHash: input.password,
    role: normalizeRole(input.role),
    status: input.status || 'active',
    avatarUrl: input.avatarUrl || '',
  });

  const token = issueToken(user);
  return buildAuthPayload(user, token);
}

async function findUserByEmail(email) {
  return User.findOne({ email }).select('+passwordHash');
}

module.exports = {
  createAccount,
  findUserByEmail,
  buildAuthPayload,
  issueToken,
  serializeUser,
};
