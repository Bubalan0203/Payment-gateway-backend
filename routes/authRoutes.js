// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { userSignup, userLogin, adminLogin } = require('../controllers/authController');

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.post('/admin-login', adminLogin);

module.exports = router;

