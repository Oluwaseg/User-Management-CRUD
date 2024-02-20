const authController = require("../controller/authController");
const express = require("express");
const router = express.Router();

router.use(authController.verifyToken);

router.post("/login", authController.loginUser);
router.post("/", authController.registerUser);

router.use(authController.checkTokenBlacklist);

router.get("/", (req, res) => {
  if (req.user) {
    return res.redirect("/home");
  }
  res.render("register.ejs");
});

router.get("/login", (req, res) => {
  if (req.user) {
    return res.redirect("/home");
  }
  res.render("login");
});

router.get("/logout", authController.logoutUser);

module.exports = router;
