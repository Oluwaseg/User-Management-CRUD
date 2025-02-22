const authController = require('../controller/authController');
const express = require('express');
const router = express.Router();

router.use(authController.checkSessionTimeout);

router.use(authController.verifyToken);

router.post('/login', authController.loginUser);
router.post('/register', authController.registerUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.use(authController.checkTokenBlacklist);

router.get('/forgot-password', (req, res) => {
  res.render('forgot.ejs');
});
router.get('/reset-password/:token', (req, res) => {
  const token = req.params.token;
  res.render('reset.ejs', { token });
});
router.get('/', (req, res) => {
  if (req.user) {
    return res.redirect('/home');
  }
  const successMsg = req.flash('success_msg');
  const errorMsg = req.flash('error_msg');
  res.render('register', {
    success_msg: successMsg,
    error_msg: errorMsg,
  });
});

router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/home');
  }
  const successMsg = req.flash('success_msg');
  const errorMsg = req.flash('error_msg');
  res.render('login', {
    success_msg: successMsg,
    error_msg: errorMsg,
  });
});

router.get('/logout', authController.logoutUser);

module.exports = router;
