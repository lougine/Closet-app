const jwt = require('jsonwebtoken');

const requiresStrongJwtSecret = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

module.exports = (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const parts = authHeader.split(" ");
  if (parts.length < 2 || !parts[1]) {
    return res.status(401).json({ message: "Invalid authorization header" });
  }

  const token = parts[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    return res.status(500).json({ message: 'Server authentication is not configured.' });
  }

  if (requiresStrongJwtSecret() && jwtSecret.length < 32) {
    return res.status(500).json({ message: 'Server authentication is not configured.' });
  }

  try {

    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });

    const normalizedUserId = decoded.userId || decoded.id || decoded._id;
    if (!normalizedUserId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.user = {
      ...decoded,
      userId: String(normalizedUserId),
    };

    next();

  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }

};