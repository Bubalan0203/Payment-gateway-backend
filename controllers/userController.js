import User from '../models/User.js';
import BankDetails from '../models/BankDetails.js';

/* GET profile of the logged-in user */
export const getProfile = async (req, res) => {
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
export const changePassword = async (req, res) => {
  // TODO: implement real logic later
  res.json({ message: 'Password changed (stub)' });
};
