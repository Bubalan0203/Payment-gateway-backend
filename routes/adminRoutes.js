import express from 'express';
const router = express.Router();

import User from '../models/User.js';
import {
  getAllUsers,
  getAdminDashboard,
  approveTransaction,
  rejectTransaction,
  settleAllTransactions
} from '../controllers/adminController.js';

// ✅ Get all users
router.get('/users', getAllUsers);

// ✅ Toggle user activation
router.put('/approve/:userId', async (req, res) => {
  const { isActive } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true }
    );
    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}`, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// ✅ Admin Dashboard Summary
router.get('/dashboard', getAdminDashboard);

router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const primaryBankAccount = user.bankAccounts?.[0];
    res.json({ user, bank: primaryBankAccount || null });
  } catch (err) {
    console.error('Error fetching user info:', err.message);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// ✅ Approve a transaction
router.put('/transactions/approve/:id', approveTransaction);

// ✅ Reject a transaction with custom reason
router.put('/transactions/reject/:id', rejectTransaction);

router.put('/transactions/settle-all', settleAllTransactions);

export default router;
