const express = require("express");
const axios = require("axios");
const { CrudData } = require("../model/model");
const { authMiddleware } = require("../controller/authController");

const route = express.Router();

route.use(authMiddleware);

// Render services

route.get("/", async (req, res) => {
  try {
    // Check if user is authenticated
    if (req.user) {
      // User is authenticated, fetch and render only their own data
      const userData = await CrudData.find({ createdBy: req.user._id });
      res.render("index", { users: userData, name: req.user.name });
    } else {
      // User is not authenticated, redirect to login page
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send({ message: "Error fetching data" });
  }
});

route.get("/add-user", (req, res) => {
  res.render("add_user");
});

route.get("/update-user", (req, res) => {
  axios
    .get("http://localhost:3000/home/api/users", {
      params: { id: req.query.id },
    })
    .then(function (userdata) {
      res.render("update_user", { user: userdata.data });
    })
    .catch((err) => {
      res.send(err);
    });
});

// API routes
route.post("/api/users", async (req, res) => {
  try {
    const user = req.user; // Get authenticated user from authMiddleware

    // Create new data associated with the authenticated user's ID
    const newData = new CrudData({
      name: req.body.name,
      email: req.body.email,
      gender: req.body.gender,
      status: req.body.status,
      createdBy: user._id, // Access _id from the User model
    });

    // Save the data
    await newData.save();
    res.redirect("/home/add-user");
  } catch (error) {
    console.error("Error creating data:", error);
    res
      .status(500)
      .send({ message: "Error creating data", error: error.message });
  }
});

route.get("/api/users/:id", async (req, res) => {
  try {
    const user = req.user; // Get authenticated user
    const id = req.params.id;

    // Find data by ID and check if it belongs to the authenticated user
    const data = await CrudData.findOne({ _id: id, createdBy: user._id });

    if (!data) {
      return res.status(404).send({ message: "Data not found" });
    }

    res.send(data);
  } catch (error) {
    res.status(500).send({ message: "Error retrieving data" });
  }
});

route.put("/api/users/:id", async (req, res) => {
  try {
    const user = req.user; // Get authenticated user
    const id = req.params.id;

    // Find data by ID and check if it belongs to the authenticated user
    const data = await CrudData.findOne({ _id: id, createdBy: user._id });

    if (!data) {
      return res.status(404).send({ message: "Data not found" });
    }

    // Update the data
    await CrudData.findByIdAndUpdate(id, req.body, { useFindAndModify: false });
    res.send({ message: "Data updated successfully" });
  } catch (error) {
    res.status(500).send({ message: "Error updating data" });
  }
});

route.delete("/api/users/:id", async (req, res) => {
  try {
    const user = req.user; // Get authenticated user
    const id = req.params.id;

    // Find data by ID and check if it belongs to the authenticated user
    const data = await CrudData.findOne({ _id: id, createdBy: user._id });

    if (!data) {
      return res.status(404).send({ message: "Data not found" });
    }

    // Delete the data
    await CrudData.findByIdAndDelete(id);
    res.send({ message: "Data deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Error deleting data" });
  }
});

route.get("/api/users", (req, res) => {
  if (req.query.id) {
    const id = req.query.id;

    CrudData.findById(id)
      .then((data) => {
        if (!data) {
          res.status(404).send({ message: "Not found user with id " + id });
        } else {
          res.send(data);
        }
      })
      .catch((err) => {
        res.status(500).send({ message: "Erro retrieving user with id " + id });
      });
  } else {
    CrudData.find()
      .then((user) => {
        res.send(user);
      })
      .catch((err) => {
        res.status(500).send({
          message:
            err.message || "Error Occurred while retriving user information",
        });
      });
  }
});

route.put("/api/users/:id", (req, res) => {
  if (!req.body) {
    return res.status(400).send({ message: "Data to update can not be empty" });
  }

  const id = req.params.id;
  CrudData.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot Update user with ${id}. Maybe user not found!`,
        });
      } else {
        res.send(data);
      }
    })
    .catch((err) => {
      res.status(500).send({ message: "Error Update user information" });
    });
});

route.delete("/api/users/:id", (req, res) => {
  const id = req.params.id;

  CrudData.findByIdAndDelete(id)
    .then((data) => {
      if (!data) {
        res
          .status(404)
          .send({ message: `Cannot Delete with id ${id}. Maybe id is wrong` });
      } else {
        res.send({ message: "User was deleted successfully!" });
      }
    })
    .catch((err) => {
      res.status(500).send({ message: "Could not delete User with id=" + id });
    });
});

module.exports = route;
