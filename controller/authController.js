const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../model/model");

require("dotenv").config();
const secretKey = process.env.JWT_SECRET;

// Function to create a JWT token for a user
const createToken = (user) => {
  const tokenData = {
    userId: user._id,
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(tokenData, secretKey, { expiresIn: "1d" });

  return token;
};

const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return next();
  }

  jwt.verify(token, secretKey, (err, decodedToken) => {
    if (err) {
      console.error("JWT verification failed:", err);
      return next();
    }
    req.user = decodedToken;
    next();
  });
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.redirect("/user/login");
    }

    const decoded = jwt.verify(token, secretKey);

    const user = await User.findById(decoded.userId);

    if (!user || !user.tokens.includes(token)) {
      return res.redirect("/user/login");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware - JWT verification failed:", error);
    return res.redirect("/user/login");
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email }, { name: name }],
    });

    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    const token = createToken(user);

    user.tokens.push(token);

    await user.save();

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    setTimeout(() => {
      res.redirect("/user/login");
    }, 3000);
  } catch (error) {
    console.error("Registration failed:", error);

    res.redirect("/user/register");
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });

    if (!user) {
      console.log("error", "Invalid email or password");
      return res.redirect("/user/login");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Please check your email and password.");
      return res.redirect("/user/login");
    }

    const token = createToken(user);

    user.tokens.push(token);

    await user.save();

    req.user = user;

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.redirect("/");
  } catch (error) {
    console.error("An error occurred:", error);
    return next(error);
  }
};
const logoutUser = async (req, res) => {
  try {
    if (!req.user) {
      console.log("Logout failed. User not authenticated.");
      return res.redirect("/user/login");
    }

    if (req.user.tokens) {
      req.user.tokens = req.user.tokens.filter(
        (token) => token !== req.cookies.jwt
      );

      await req.user.save();
    }

    res.clearCookie("jwt");

    console.log("Logout successful!");
    res.redirect("/user/login");
  } catch (error) {
    console.error("Logout failed:", error);
    res.redirect("/");
  }
};

const checkTokenBlacklist = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token && req.user?.tokens?.includes(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  logoutUser,
  authMiddleware,
  checkTokenBlacklist,
};
