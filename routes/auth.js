require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../model/model");

const app = express();
const jwtSecret = process.env.JWT_SECRET;

// Register a new user
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create new user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "1h",
    });

    user.tokens.push(token);
    await user.save();

    res.render("login");
    // res.status(201).json({ token });  Send token back to the client
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user");
  }
});

// User login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login request received for email:", email);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).send("User not found");
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("Invalid password for user with email:", email);
      return res.status(401).send("Invalid password");
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "1h",
    });
    user.tokens.push(token);
    await user.save();

    console.log("Redirecting user to the root URL");
    res.redirect(302, "/");
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Error logging in");
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});
// Middleware to verify JWT token
// Logout endpoint
app.post("/logout", async (req, res) => {
  try {
    // Assuming you have a User model with a tokens field
    req.user.tokens = []; // Clear all tokens for the user
    await req.user.save();
    res.status(200).send("Logged out successfully");
  } catch (error) {
    console.error("Logout failed:", error.message);
    res.status(500).send("Logout failed");
  }
});

module.exports = app;
