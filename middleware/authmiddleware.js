require("dotenv").config();
const jwt = require("jsonwebtoken");
const { User } = require("../model/model");
const jwtSecret = process.env.JWT_SECRET;
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from request headers
    const token = req.headers.authorization;

    // Check if token is provided
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify token
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Retrieve user based on decoded user ID
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Attach authenticated user to request object
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Error authenticating token:", error);
    res.status(500).json({ message: "Error authenticating token" });
  }
};

module.exports = authenticateToken;
