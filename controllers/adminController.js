// controllers/adminController.js
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const BankDetails = require('../models/BankDetails');
const Admin = require('../models/Admin');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { isActive: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User approved', user });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const transactions = await Transaction.find();

    const totalAmountReceived = transactions.reduce((sum, tx) => sum + tx.originalAmount, 0);
    const totalCommission = transactions.reduce((sum, tx) => sum + tx.commission, 0);
    const totalPaidToMerchants = transactions.reduce((sum, tx) => sum + tx.amountToMerchant, 0);

    res.json({
      totalAmountReceived,
      totalCommission,
      totalPaidToMerchants,
      totalTransactions: transactions.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard error' });
  }
};
