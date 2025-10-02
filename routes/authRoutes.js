import express from 'express';
const router = express.Router();

import {
  userSignup,
  userLogin,
  adminLogin,
  addBankAccount,
  addSiteUrl
} from '../controllers/authController.js';

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.post('/admin-login', adminLogin);

// Add bank account (for now: using userId from body)
router.post('/add-bank-account', addBankAccount);
router.post('/add-site-url', addSiteUrl);

export default router;
