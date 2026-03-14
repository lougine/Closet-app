// @ts-ignore
const User = require('../models/user');
// @ts-ignore
const bcrypt = require('bcryptjs');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const payload = user.toObject();
    payload.username = payload.name;

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Prevent password updates through this endpoint
    delete updates.password;

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
      select: '-password',
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  // Placeholder: return an empty set of notifications. Expand this as needed.
  res.json({ notifications: [] });
};

exports.updatePrivacy = async (req, res) => {
  try {
    const { privacy } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.preferences = user.preferences || {};
    user.preferences.privacy = privacy;
    await user.save();

    res.json({ message: 'Privacy updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActivity = async (req, res) => {
  // Placeholder activity feed. Extend with more detailed logic as needed.
  try {
    const activities = [
      {
        _id: '1',
        type: 'outfit_logged',
        description: 'Logged a new outfit',
        date: new Date().toISOString(),
      },
    ];
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
