const User = require('../models/user');
const { buildAuthPayload, createAccount, findUserByEmail, issueToken, serializeUser } = require('../services/accountService');
const { notifyActivity } = require('../services/activityNotificationService');

async function register(req, res, next) {
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
      actor: payload.user,
      action: 'registered',
      target: {
        type: 'user account',
        name: payload.user.fullName,
        id: payload.user._id,
      },
      summary: `A new user account was created with the ${payload.user.role} role.`,
    });

    return res.status(201).json(payload);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    void notifyActivity({
      actor: serializeUser(user),
      action: 'logged in',
      target: {
        type: 'user account',
        name: user.fullName,
        id: user._id,
      },
      summary: 'The user signed in successfully.',
    });

    const token = issueToken(user);
    return res.status(200).json(buildAuthPayload(user, token));
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
};
