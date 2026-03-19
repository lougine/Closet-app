const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_EXPIRY = '7d';

const buildSessionToken = (userId) => jwt.sign(
  { userId },
  process.env.JWT_SECRET,
  { expiresIn: JWT_EXPIRY },
);

const normalizeName = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .slice(0, 64);

const buildUniqueUserName = async (nameSeed) => {
  const baseName = normalizeName(nameSeed) || 'user';
  let candidate = baseName;
  let suffix = 1;

  while (await User.exists({ name: candidate })) {
    candidate = `${baseName}${suffix}`;
    suffix += 1;
  }

  return candidate;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Automatically return a token so the client can log the user in immediately
    const token = buildSessionToken(user._id);

    res.status(201).json({ message: "User registered successfully", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = buildSessionToken(user._id);

    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.exchangeGoogleToken = async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ message: 'accessToken is required' });
    }

    const googleResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleResponse.ok) {
      return res.status(401).json({ message: 'Invalid Google access token' });
    }

    const googleProfile = await googleResponse.json();
    const email = String(googleProfile?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Google account email is required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const userNameSeed = normalizeName(googleProfile?.name) || email.split('@')[0] || 'user';
      const uniqueName = await buildUniqueUserName(userNameSeed);
      const generatedPassword = `google:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      user = await User.create({
        name: uniqueName,
        email,
        password: hashedPassword,
        profilePicture: googleProfile?.picture || null,
      });
    }

    const token = buildSessionToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};