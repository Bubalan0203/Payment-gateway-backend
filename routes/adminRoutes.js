// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getAllUsers, getAdminDashboard } = require('../controllers/adminController');

router.get('/users', getAllUsers);
router.put('/approve/:userId', async (req, res) => {
  const { isActive } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true }
    );
    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}`, user });
  } catch (err) {
    console.error('Error toggling user:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

router.get('/dashboard', getAdminDashboard);

router.get('/user/:userId', async (req, res) => {
  const BankDetails = require('../models/BankDetails');
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const bank = await BankDetails.findOne({ accountNumber: user.bankAccountNumber });
  res.json({ user, bank });
});

module.exports = router;
