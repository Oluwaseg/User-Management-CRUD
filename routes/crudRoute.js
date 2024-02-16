const express = require("express");
const axios = require("axios");
const router = express.Router();
const { CrudData } = require("../model/model");
const { authMiddleware, verifyToken } = require("../controller/authController");

router.use(verifyToken);
// Root Route
router.get("/", authMiddleware, (req, res) => {
  axios
    .get("http://localhost:3000/api/users")
    .then(function (response) {
      console.log(response.data);
      res.render("index", { users: response.data, name: req.user.name });
    })
    .catch((err) => {
      res.send(err);
    });
});

// Add user route
router.get("/add-user", (req, res) => {
  res.render("add_user");
});

// Update user route
router.get("/update-user", (req, res) => {
  axios
    .get("http://localhost:3000/api/users", { params: { id: req.query.id } })
    .then(function (userdata) {
      res.render("update_user", { user: userdata.data });
    })
    .catch((err) => {
      res.send(err);
    });
});

// API routes

// Create user
router.post("/api/users", authMiddleware, (req, res) => {
  if (!req.body) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  const user = req.user; // Get the authenticated user from the request object

  const newData = new CrudData({
    name: req.body.name,
    email: req.body.email,
    gender: req.body.gender,
    status: req.body.status,
    createdBy: user._id, // Associate the data with the authenticated user's ID
  });

  newData
    .save()
    .then((data) => {
      res.redirect("/add-user");
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while creating a create operation",
      });
    });
});

// Read operation
router.get("/api/users", authMiddleware, (req, res) => {
  const userId = req.user._id; // Get the authenticated user's ID

  CrudData.find({ createdBy: userId }) // Find data entries associated with the authenticated user's ID
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error Occurred while retrieving user information",
      });
    });
});

// Update operation
router.put("/api/users/:id", authMiddleware, (req, res) => {
  const userId = req.user._id; // Get the authenticated user's ID
  const id = req.params.id;

  // Find the data entry by ID and ensure it belongs to the authenticated user
  CrudData.findOneAndUpdate({ _id: id, createdBy: userId }, req.body, {
    new: true,
  })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot Update user with ${id}. Maybe user not found or unauthorized!`,
        });
      } else {
        res.send(data);
      }
    })
    .catch((err) => {
      res.status(500).send({ message: "Error Update user information" });
    });
});

// Delete operation
router.delete("/api/users/:id", authMiddleware, (req, res) => {
  const userId = req.user._id; // Get the authenticated user's ID
  const id = req.params.id;

  // Find the data entry by ID and ensure it belongs to the authenticated user
  CrudData.findOneAndDelete({ _id: id, createdBy: userId })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot Delete with id ${id}. Maybe id is wrong or unauthorized!`,
        });
      } else {
        res.send({
          message: "User was deleted successfully!",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete User with id=" + id,
      });
    });
});
module.exports = router;
