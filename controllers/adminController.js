const axios = require('axios');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');
const { decrypt, encrypt } = require('./cryptoUtil');
const BANK_API_BASE = 'http://localhost:5003';
// const BANK_API_BASE = 'http://192.168.172.113:5003';
const { v4: uuidv4 } = require('uuid');
/* 🔄 Utility Functions */

// ✅ Fetch and validate transaction before update
const getValidTransaction = async (id, expectedStatus) => {
  console.log(`🔍 Fetching transaction by ID: ${id}`);
  const txn = await Transaction.findById(id);
  if (!txn) {
    console.error('❌ Transaction not found');
    throw new Error('❌ Transaction not found');
  }

  if (txn.overallStatus === expectedStatus) {
    console.warn(`⚠️ Transaction already marked as ${expectedStatus}`);
    throw new Error(`⚠️ Transaction already marked as ${expectedStatus}`);
  }

  console.log(`✅ Transaction fetched: ${txn._id}`);
  return txn;
};

// ✅ Approve transaction logic: Admin → Merchant
const approveTransactionAndUpdate = async (txn, settlementGroupId = null) => {
  try {
    console.log('🚀 Approving transaction...');
    console.log('💸 Settling from Admin to Merchant:', {
      from: txn.adminAccountNumber,
      to: txn.toAccountNumber,
      amount: txn.amountToMerchant,
    });

    // 🔐 Encrypt payload directly
    const encryptedPayload = encrypt({
      fromAccountNumber: txn.adminAccountNumber,
      toAccountNumber: txn.toAccountNumber,
      amount: txn.amountToMerchant,
    });

    const response = await axios.post(`${BANK_API_BASE}/settle`, encryptedPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
 const settledGroupId = `SETTLE-${Date.now()}`;
    // 🔓 Decrypt response
    const data = decrypt(response.data);
    console.log('✅ Bank response:', data);

    // ✅ Update transaction fields
    txn.adminToMerchantStatus = 'success';
    txn.adminToMerchantDescription = 'Approved by admin';
    txn.adminToMerchantTime = new Date();
    txn.settlementTransactionId = data.transactionId || `SETTLE-${Date.now()}`;
    txn.overallStatus = 'success';

    // ✅ Save batch ID if passed
    if (settlementGroupId) {
      txn.settlementGroupId = settlementGroupId;
    }else{
      txn.settlementGroupId = settledGroupId;

    }

    await txn.save();
    console.log('💾 Transaction updated in DB:', txn._id);

    return txn;
  } catch (err) {
    console.error('❌ Error in approving transaction:', err.message);
    throw new Error(err.response?.data?.message || '❌ Failed to approve transaction');
  }
};

// ✅ Reject logic: Refund from Admin → Payer
const rejectTransactionAndRefund = async (txn, reason = '') => {
  try {
    const refundAmount = txn.originalAmount - txn.commission;

    console.log('🚫 Rejecting transaction and refunding...');
    console.log('🔄 Refund details:', {
      from: txn.adminAccountNumber,
      to: txn.fromAccountNumber,
      amount: refundAmount,
    });

    // 🔐 Encrypt the refund request body
    const encryptedPayload = encrypt({
      fromAccountNumber: txn.adminAccountNumber,
      toAccountNumber: txn.fromAccountNumber,
      amount: refundAmount,
    });

    // 📤 Send encrypted refund request
    const response = await axios.post(`${BANK_API_BASE}/refund`, encryptedPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
const settledGroupId = `SETTLE-${Date.now()}`;
    // 🔓 Decrypt bank response
    const decrypted = decrypt(response.data);

    console.log('✅ Bank refund response:', decrypted);

    txn.payeeToAdminStatus = 'refunded';
    txn.payeeToAdminDescription = 'Refunded to customer';
    txn.payeeToAdminTime = Date.now();

    txn.adminToMerchantStatus = 'failed';
    txn.adminToMerchantDescription = reason || 'Rejected by admin';
    txn.adminToMerchantTime = Date.now();

    txn.settlementTransactionId = decrypted.transactionId || `REFUND-${Date.now()}`;
    txn.overallStatus = 'failed';
     txn.settlementGroupId = settledGroupId;

    await txn.save();
    console.log('💾 Transaction updated after refund:', txn._id);

    return txn;
  } catch (err) {
    console.error('❌ Error in rejecting transaction:', err.message);
    throw new Error(err.response?.data?.error || '❌ Failed to reject transaction');
  }
};

/* 🚀 Admin Controller Functions */

// ✅ Approve a single transaction
exports.approveTransaction = async (req, res) => {
  try {
    console.log(`📩 Received approval request for txn ID: ${req.params.id}`);
    const txn = await getValidTransaction(req.params.id, 'success');
    const updatedTxn = await approveTransactionAndUpdate(txn);

    console.log('✅ Final Approved Transaction:', updatedTxn);
    res.json({
      message: '✅ Transaction approved and settled to merchant',
      txn: updatedTxn,
    });
  } catch (err) {
    console.error('❌ Approve Transaction Error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ Reject a transaction (admin-side)
exports.rejectTransaction = async (req, res) => {
  try {
    console.log(`📩 Received rejection request for txn ID: ${req.params.id}`);
    const txn = await getValidTransaction(req.params.id, 'failed');
    const updatedTxn = await rejectTransactionAndRefund(txn, req.body.reason);

    console.log('❌ Final Rejected Transaction:', updatedTxn);
    res.json({
      message: '❌ Transaction rejected and refunded to customer',
      txn: updatedTxn,
    });
  } catch (err) {
    console.error('❌ Reject Transaction Error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ Settle all pending transactions in one batch
exports.settleAllTransactions = async (req, res) => {
  try {
    console.log('📦 Settling all pending transactions...');
    const pendingTxns = await Transaction.find({ overallStatus: 'pending' });

    if (pendingTxns.length === 0) {
      console.log('✅ No pending transactions to settle');
      return res.json({ message: 'No pending transactions to settle' });
    }

    console.log(`🧮 Found ${pendingTxns.length} pending transactions`);

    // ✅ Custom formatted ID
    const settlementGroupId = `SETTLE-${Date.now()}`;
    let count = 0;

    for (const txn of pendingTxns) {
      try {
        console.log(`➡️ Settling txn: ${txn._id}`);
        await approveTransactionAndUpdate(txn, settlementGroupId); // ✅ pass group ID
        count++;
      } catch (innerErr) {
        console.warn(`⏭️ Skipped txn ${txn._id} due to error: ${innerErr.message}`);
      }
    }

    console.log(`✅ Settled ${count} transactions successfully`);
    res.json({ 
      message: `✅ Settled ${count} transactions.`,
      settlementGroupId 
    });
  } catch (err) {
    console.error('❌ Batch approval error:', err.message);
    res.status(500).json({ error: 'Error settling all transactions' });
  }
};






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
