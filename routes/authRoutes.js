const express = require('express');
const router = express.Router();
const { userSignup, userLogin, adminLogin } = require('../controllers/authController');

// User registration (multi-step form handles phone, address, kyc, etc.)
router.post('/signup', userSignup);

// User login
router.post('/login', userLogin);

// Admin login
router.post('/admin-login', adminLogin);

module.exports = router;