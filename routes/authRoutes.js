const express = require('express');
const router = express.Router();
const {
  userSignup,
  userLogin,
  adminLogin,
  addBankAccount
} = require('../controllers/authController');

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.post('/admin-login', adminLogin);

// Add bank account (for now: using userId from body)
router.post('/add-bank-account', addBankAccount);

module.exports = router;
