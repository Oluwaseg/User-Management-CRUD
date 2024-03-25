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

            <link
              href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css"
              rel="stylesheet"
            />
          </head>
          <body>
            <div
              id="successModal"
              tabindex="-1"
              aria-hidden="true"
              class="hidden fixed top-0 right-0 bottom-0 left-0 flex items-center justify-center shadow-lg"
            >
              <div class="relative p-4 w-full max-w-md h-full md:h-auto">
                <!-- Modal content -->
                <div
                  class="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5"
                >
                  <button
                    type="button"
                    class="text-gray-400 absolute top-2.5 right-2.5 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                    data-modal-toggle="successModal"
                  >
                    <svg
                      aria-hidden="true"
                      class="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    <span class="sr-only">Close modal</span>
                  </button>
                  <div
                    class="w-12 h-12 rounded-full bg-white hover:bg-blue-100 transition duration-700 ease-in-out dark:bg-green-900 p-2 flex items-center justify-center mx-auto mb-3.5 shadow-xl"
                  >
                    <svg
                      aria-hidden="true"
                      class="w-8 h-8 text-green-500 dark:text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    <span class="sr-only">Success</span>
                  </div>
                  <p
                    class="mb-4 mt-4 text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Email Sent Successfully
                  </p>
                  <p
                    class="mb-4 mt-4 text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Please check your email for further instructions.
                  </p>
                  <button
                    data-modal-toggle="successModal"
                    type="button"
                    onclick="window.location.href = '/login';"
                    class="py-2 px-3 text-sm font-medium shadow-md text-center text-white rounded-lg bg-purple-600 hover:bg-white hover:text-purple-600 transition duration-700 ease-in-out hover:shadow-xl focus:ring-4 focus:outline-none focus:ring-primary-300 dark:focus:ring-primary-900"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>

            <script>
              document.addEventListener("DOMContentLoaded", function () {
                // Show the modal when the page loads
                document.getElementById("successModal").classList.remove("hidden");
              });
            </script>
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
