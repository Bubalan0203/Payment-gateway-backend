const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');

// ✅ Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
};

// ✅ Admin dashboard summary
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

// ✅ Admin accepts transaction → pays merchant
exports.approveTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.overallStatus === 'success') return res.status(400).json({ error: 'Already approved' });

    const merchantBank = await BankDetails.findOne({ accountNumber: txn.toAccountNumber });
    const adminBank = await BankDetails.findOne({ accountNumber: txn.adminAccountNumber });

    if (!merchantBank || !adminBank) return res.status(400).json({ error: 'Missing bank details' });

    if (adminBank.balance < txn.amountToMerchant)
      return res.status(400).json({ error: 'Admin has insufficient balance' });

    adminBank.balance -= txn.amountToMerchant;
    merchantBank.balance += txn.amountToMerchant;
    await adminBank.save();
    await merchantBank.save();

    txn.adminToMerchantStatus = 'success';
    txn.adminToMerchantDescription = 'Approved by admin';
    txn.adminToMerchantTime = Date.now();
    txn.overallStatus = 'success';
    await txn.save();

    res.json({ message: 'Transaction approved and settled to merchant', txn });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Internal error approving transaction' });
  }
};

// ✅ Admin rejects transaction → refund to customer
exports.rejectTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    const { reason } = req.body;

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.overallStatus === 'failed') return res.status(400).json({ error: 'Already rejected' });

    const adminBank = await BankDetails.findOne({ accountNumber: txn.adminAccountNumber });
    const payerBank = await BankDetails.findOne({ accountNumber: txn.fromAccountNumber });

    if (!payerBank || !adminBank) return res.status(400).json({ error: 'Missing bank accounts' });

    const refundAmount = txn.originalAmount - txn.commission;

    if (adminBank.balance < refundAmount)
      return res.status(400).json({ error: 'Admin has insufficient balance to refund' });

    adminBank.balance -= refundAmount;
    payerBank.balance += refundAmount;
    await adminBank.save();
    await payerBank.save();

    txn.payeeToAdminStatus = 'refunded';
    txn.payeeToAdminDescription = 'Refunded to customer';
    txn.payeeToAdminTime = Date.now();

    txn.adminToMerchantStatus = 'failed';
    txn.adminToMerchantDescription = reason || 'Rejected by admin';
    txn.adminToMerchantTime = Date.now();

    txn.overallStatus = 'failed';

    await txn.save();

    res.json({ message: 'Transaction rejected and refunded to customer', txn });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Internal error rejecting transaction' });
  }
};