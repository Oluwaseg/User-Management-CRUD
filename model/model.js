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

const crudDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  gender: String,
  status: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, // Store the user's unique identifier
    ref: "User", // Reference the User model for easy population
    required: true,
  },
});

const User = mongoose.model("User", userSchema);
const CrudData = mongoose.model("CrudData", crudDataSchema);

module.exports = { User, CrudData };
