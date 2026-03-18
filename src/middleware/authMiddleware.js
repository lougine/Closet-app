const jwt = require('jsonwebtoken');

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

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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