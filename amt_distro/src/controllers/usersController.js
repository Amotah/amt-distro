const User = require('../models/user');
const { createAccount, serializeUser } = require('../services/accountService');
const { notifyActivity } = require('../services/activityNotificationService');

async function listUsers(_req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json(users.map(serializeUser));
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { fullName, email, password, role, avatarUrl } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email, and password are required' });
    }

    const payload = await createAccount({
      fullName,
      email,
      password,
      role,
      avatarUrl,
    });

    void notifyActivity({
      actor: req.user,
      action: 'created a user',
      target: {
        type: 'user account',
        name: payload.user.fullName,
        id: payload.user._id,
      },
      summary: `Created a ${payload.user.role} account for ${payload.user.email}.`,
    });

    return res.status(201).json(payload);
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, email, password, role, status, avatarUrl } = req.body;

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.passwordHash = password;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    void notifyActivity({
      actor: req.user,
      action: 'updated a user',
      target: {
        type: 'user account',
        name: user.fullName,
        id: user._id,
      },
      summary: `Updated user profile for ${user.email}.`,
    });

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    void notifyActivity({
      actor: req.user,
      action: 'deleted a user',
      target: {
        type: 'user account',
        name: user.fullName,
        id: user._id,
      },
      summary: `Deleted user account ${user.email}.`,
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
