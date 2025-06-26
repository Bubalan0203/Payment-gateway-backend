const User        = require('../models/User');
const BankDetails = require('../models/BankDetails');

/* GET profile of the logged-in user */
exports.getProfile = async (req, res) => {
  try {
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(404).json({ error: 'User not found' });

    const bank = await BankDetails.findOne({ accountNumber: u.bankAccountNumber });
    res.json({ user: u, bank });
  } catch (e) {
    res.status(500).json({ error: 'Profile fetch failed', details: e.message });
  }
};

/* Change password (placeholder) */
exports.changePassword = async (req, res) => {
  // TODO: implement real logic later
  res.json({ message: 'Password changed (stub)' });
};