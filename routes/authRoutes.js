const express = require('express');
const router = express.Router();
const {
  userSignup,
  userLogin,
  adminLogin,
  addBankAccount,
  addSiteUrl
} = require('../controllers/authController');

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.post('/admin-login', adminLogin);

// Add bank account (for now: using userId from body)
router.post('/add-bank-account', addBankAccount);
router.post('/add-site-url', addSiteUrl);
module.exports = router;
