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
  referrer: { type: String },
  resetPasswordToken: String,
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
  street: String,
  city: String,
  state: String,
  phone: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const User = mongoose.model("User", userSchema);
const CrudData = mongoose.model("CrudData", crudDataSchema);

module.exports = { User, CrudData };
