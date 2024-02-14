const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  gender: String,
  status: String,
  password: {
    type: String,
    required: true,
  },
  tokens: [
    {
      type: String,
      required: true,
    },
  ],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
