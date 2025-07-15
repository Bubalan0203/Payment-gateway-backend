const axios = require('axios');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');

// const BANK_API_BASE = 'http://localhost:5002/api/bank';
const BANK_API_BASE = 'https://paygatebank.onrender.com/api/bank';
/* 🔄 Utility Functions */

// ✅ Fetch and validate transaction before update
const getValidTransaction = async (id, expectedStatus) => {
  const txn = await Transaction.findById(id);
  if (!txn) throw new Error('❌ Transaction not found');
  if (txn.overallStatus === expectedStatus)
    throw new Error(`⚠️ Transaction already marked as ${expectedStatus}`);
  return txn;
};

// ✅ Approve transaction logic: Admin → Merchant
const approveTransactionAndUpdate = async (txn) => {
  try {
    const response = await axios.post(`${BANK_API_BASE}/settle`, {
      fromAccountNumber: txn.adminAccountNumber,
      toAccountNumber: txn.toAccountNumber,
      amount: txn.amountToMerchant,
    });

    txn.adminToMerchantStatus = 'success';
    txn.adminToMerchantDescription = 'Approved by admin';
    txn.adminToMerchantTime = Date.now();
    txn.settlementTransactionId = response.data.transactionId || `SETTLE-${Date.now()}`;
    txn.overallStatus = 'success';

    await txn.save();
    return txn;
  } catch (err) {
    throw new Error(err.response?.data?.error || '❌ Failed to approve transaction');
  }
};

// ✅ Reject logic: Refund from Admin → Payer
const rejectTransactionAndRefund = async (txn, reason = '') => {
  try {
    const refundAmount = txn.originalAmount - txn.commission;

    const response = await axios.post(`${BANK_API_BASE}/refund`, {
      fromAccountNumber: txn.adminAccountNumber,
      toAccountNumber: txn.fromAccountNumber,
      amount: refundAmount,
    });

    txn.payeeToAdminStatus = 'refunded';
    txn.payeeToAdminDescription = 'Refunded to customer';
    txn.payeeToAdminTime = Date.now();

    txn.adminToMerchantStatus = 'failed';
    txn.adminToMerchantDescription = reason || 'Rejected by admin';
    txn.adminToMerchantTime = Date.now();

    txn.refundTransactionId = response.data.transactionId || `REFUND-${Date.now()}`;
    txn.overallStatus = 'failed';

    await txn.save();
    return txn;
  } catch (err) {
    throw new Error(err.response?.data?.error || '❌ Failed to reject transaction');
  }
};

/* 🚀 Admin Controller Functions */

// ✅ Get all users (for admin panel)
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
      totalTransactions: transactions.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard error' });
  }
};

// ✅ Approve a single transaction
exports.approveTransaction = async (req, res) => {
  try {
    const txn = await getValidTransaction(req.params.id, 'success');
    const updatedTxn = await approveTransactionAndUpdate(txn);
    res.json({
      message: '✅ Transaction approved and settled to merchant',
      txn: updatedTxn,
    });
  } catch (err) {
    console.error('Approve error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ Reject a transaction (admin-side)
exports.rejectTransaction = async (req, res) => {
  try {
    const txn = await getValidTransaction(req.params.id, 'failed');
    const updatedTxn = await rejectTransactionAndRefund(txn, req.body.reason);
    res.json({
      message: '❌ Transaction rejected and refunded to customer',
      txn: updatedTxn,
    });
  } catch (err) {
    console.error('Reject error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ Settle all pending transactions in one batch
exports.settleAllTransactions = async (req, res) => {
  try {
    const pendingTxns = await Transaction.find({ overallStatus: 'pending' });

    if (pendingTxns.length === 0) {
      return res.json({ message: 'No pending transactions to settle' });
    }

    let count = 0;

    for (const txn of pendingTxns) {
      try {
        await approveTransactionAndUpdate(txn);
        count++;
      } catch (innerErr) {
        console.warn(`⏭️ Skipped txn ${txn._id}: ${innerErr.message}`);
      }
    }

    res.json({ message: `✅ Settled ${count} transactions.` });
  } catch (err) {
    console.error('Batch approval error:', err.message);
    res.status(500).json({ error: 'Error settling all transactions' });
  }
};