const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../model/model");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const validator = require("validator");

require("dotenv").config();
const secretKey = process.env.JWT_SECRET;

// Function to create a JWT token for a user
const createToken = (user) => {
  const tokenData = {
    userId: user._id,
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(tokenData, secretKey, { expiresIn: "10m" });

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
      return next();
    }

    const decoded = jwt.verify(token, secretKey);

    const user = await User.findById(decoded.userId);

    if (!user || !user.tokens.includes(token)) {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    req.user = user;
    req.user.exp = decoded.exp;
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = req.user.exp - currentTime;
    const remainingMinutes = Math.floor(remainingTime / 60);
    console.log(`Remaining time until timeout: ${remainingMinutes} minutes`);

    next();
  } catch (error) {
    console.error("Auth Middleware - JWT verification failed:", error);
    return res.redirect("/login");
  }
};
const checkSessionTimeout = (req, res, next) => {
  if (req.user && req.user.exp < Math.floor(Date.now() / 1000)) {
    // Token has expired, clear cookie and redirect to login
    res.clearCookie("jwt");
    return res.redirect("/login");
  }

  next();
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, referrer } = req.body;

    if (!validator.isEmail(email)) {
      req.flash("error_msg", "Invalid email format");
      return res.redirect("/register");
    }

    if (password.length < 6) {
      req.flash("error_msg", "Password must be at least 6 characters long");
      return res.redirect("/register");
    }

    const existingUser = await User.findOne({
      $or: [{ email: email }, { name: name }],
    });

    if (existingUser) {
      req.flash("error_msg", "Email already exists");
      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      referrer,
    });

    const token = createToken(user);

    user.tokens.push(token);

    await user.save();

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.redirect("/login");
  } catch (error) {
    req.flash("error_msg", "Registration failed");
    res.redirect("/");
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });

    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/login");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      req.flash("error_msg", "Invalid password");
      return res.redirect("/login");
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

    return res.redirect("/home/");
  } catch (error) {
    req.flash("error_msg", "Login failed");
    return next(error);
  }
};
const logoutUser = async (req, res) => {
  try {
    if (!req.user) {
      console.log("Logout failed. User not authenticated.");
      return res.redirect("/login");
    }

    if (req.user.tokens) {
      req.user.tokens = req.user.tokens.filter(
        (token) => token !== req.cookies.jwt
      );

      await req.user.save();
    }

    res.clearCookie("jwt");

    console.log("Logout successful!");
    res.redirect("/login");
  } catch (error) {
    console.error("Logout failed:", error);
    res.redirect("/home");
  }
};

const checkTokenBlacklist = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token && req.user?.tokens?.includes(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("User Not Found");
    }

    const token = jwt.sign({ email }, process.env.RESET_PASSWORD_SECRET, {
      expiresIn: "15m",
    });

    user.resetPasswordToken = token;
    await user.save();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Password Reset",
      html: `<p>You are receiving this email because you (or someone else) has requested the reset of the password for your account.</p>
            <p>Please click on the following link to reset your password. If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <p><a href="${process.env.CLIENT_URL}/reset-password/${token}">Reset Password</a></p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send("Failed to send email");
      } else {
        res.send(`<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Forgot Password Success</title>
      <!-- Bootstrap CSS -->
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css"
        rel="stylesheet"
      />
      <!-- Tailwind CSS -->
      <link
        href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
        rel="stylesheet"
      />
      <!-- Font Awesome -->
      <script src="https://kit.fontawesome.com/a076d05399.js"></script>
      <style>
        /* Center the modal vertically and horizontally */
        .modal {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 0 10px;
        }

        /* Styling for modal content */
        .modal-content {
          background-color: #ffffff;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 20px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        /* Close button style */
        .close {
          color: #6b7280;
          font-size: 20px;
          cursor: pointer;
          position: absolute;
          top: 10px;
          right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <div class="text-center">
            <div class="text-green-500">
              <i class="fas fa-check-circle fa-5x"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mt-4">
              Email Sent Successfully
            </h2>
            <p class="text-sm text-gray-600 mt-2">
              Please check your email for further instructions.
            </p>
          </div>
          <div class="flex justify-center mt-4">
            <button
              type="button"
              onclick="window.location.href = '/login';"
              class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:bg-indigo-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </body>
  </html>
  `);
      }
    });
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify the reset password token
    const decodedToken = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);

    // Find the user by email associated with the token
    const user = await User.findOne({ email: decodedToken.email });

    // Check if user exists
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Check if the reset password token matches the one stored in the user document
    if (user.resetPasswordToken !== token) {
      return res.status(401).send("Invalid or expired token");
    }

    // Validate the password format
    if (typeof password !== "string") {
      return res.status(400).send("Password must be a string");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and clear the reset password token
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    await user.save();

    // Redirect the user to the login page after successful password reset
    res.redirect("/login");
  } catch (error) {
    // Log the error for debugging
    console.error("Reset password error:", error);

    // Handle different error scenarios
    if (error.name === "TokenExpiredError") {
      return res.status(401).send("Token expired");
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).send("Invalid token");
    } else {
      return res.status(500).send("Internal Server Error");
    }
  }
};

module.exports = {
  checkSessionTimeout,
  registerUser,
  loginUser,
  verifyToken,
  logoutUser,
  authMiddleware,
  checkTokenBlacklist,
  forgotPassword,
  resetPassword,
};
