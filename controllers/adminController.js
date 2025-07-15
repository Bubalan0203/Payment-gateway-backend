const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');

/* 🔄 Reusable Utilities */

// ✅ Fetch and validate transaction
const getValidTransaction = async (id, expectedStatus) => {
  const txn = await Transaction.findById(id);
  if (!txn) throw new Error('❌ Transaction not found');
  if (txn.overallStatus === expectedStatus)
    throw new Error(`⚠️ Transaction already ${expectedStatus}`);
  return txn;
};

// ✅ Fetch and validate bank accounts
const getBankAccountsForTransaction = async (txn, type = 'approve') => {
  const adminBank = await BankDetails.findOne({ accountNumber: txn.adminAccountNumber });
  if (!adminBank) throw new Error('❌ Admin bank account not found');

  const merchantBank = await BankDetails.findOne({ accountNumber: txn.toAccountNumber });
  const payerBank = await BankDetails.findOne({ accountNumber: txn.fromAccountNumber });

  if (type === 'approve') {
    if (!merchantBank) throw new Error('❌ Merchant bank account not found');
    return { adminBank, merchantBank };
  }

  if (type === 'reject') {
    if (!payerBank) throw new Error('❌ Payer bank account not found');
    return { adminBank, payerBank };
  }
};

// ✅ Approve transaction logic
const approveTransactionAndUpdate = async (txn, adminBank, merchantBank) => {
  if (adminBank.balance < txn.amountToMerchant)
    throw new Error('❌ Admin has insufficient balance');

  adminBank.balance -= txn.amountToMerchant;
  merchantBank.balance += txn.amountToMerchant;

  await adminBank.save();
  await merchantBank.save();

  txn.adminToMerchantStatus = 'success';
  txn.adminToMerchantDescription = 'Approved by admin';
  txn.adminToMerchantTime = Date.now();
  txn.overallStatus = 'success';
  await txn.save();

  return txn;
};

// ✅ Reject transaction logic
const rejectTransactionAndRefund = async (txn, adminBank, payerBank, reason = '') => {
  const refundAmount = txn.originalAmount - txn.commission;
  if (adminBank.balance < refundAmount)
    throw new Error('❌ Admin has insufficient balance to refund');

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

  return txn;
};

/* 🚀 Admin Controller Functions */

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

// ✅ Approve a transaction
exports.approveTransaction = async (req, res) => {
  try {
    const txn = await getValidTransaction(req.params.id, 'success');
    const { adminBank, merchantBank } = await getBankAccountsForTransaction(txn, 'approve');
    const updatedTxn = await approveTransactionAndUpdate(txn, adminBank, merchantBank);
    res.json({ message: '✅ Transaction approved and settled to merchant', txn: updatedTxn });
  } catch (err) {
    console.error('Approve error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ Reject a transaction
exports.rejectTransaction = async (req, res) => {
  try {
    const txn = await getValidTransaction(req.params.id, 'failed');
    const { adminBank, payerBank } = await getBankAccountsForTransaction(txn, 'reject');
    const updatedTxn = await rejectTransactionAndRefund(txn, adminBank, payerBank, req.body.reason);
    res.json({ message: '❌ Transaction rejected and refunded to customer', txn: updatedTxn });
  } catch (err) {
    console.error('Reject error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ Settle all pending transactions in batch
exports.settleAllTransactions = async (req, res) => {
  try {
    const pendingTxns = await Transaction.find({ overallStatus: 'pending' });

    if (pendingTxns.length === 0)
      return res.json({ message: 'No pending transactions to settle' });

    let count = 0;

    for (const txn of pendingTxns) {
      try {
        const { adminBank, merchantBank } = await getBankAccountsForTransaction(txn, 'approve');
        await approveTransactionAndUpdate(txn, adminBank, merchantBank);
        count++;
      } catch (innerErr) {
        console.warn(`⏭️ Skipped txn ${txn._id}: ${innerErr.message}`);
        continue;
      }
    }

    res.json({ message: `✅ Settled ${count} transactions.` });
  } catch (err) {
    console.error('Batch approval error:', err.message);
    res.status(500).json({ error: 'Error settling all transactions' });
  }
};