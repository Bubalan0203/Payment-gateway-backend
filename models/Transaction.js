const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  integrationCode: String,

  // Party details
  fromAccountNumber: String, // Customer (payer)
  toAccountNumber: String,   // Merchant (payee)
  adminAccountNumber: String,

  // Amount breakdown
  originalAmount: Number,
  commission: Number,
  amountToMerchant: Number,

  // PAYEE → ADMIN transfer (initial customer payment)
  payeeToAdminStatus: {
    type: String,
    enum: ['success', 'failed', 'refunded'],
    default: 'success'
  },
  payeeToAdminDescription: String,
  payeeToAdminTime: { type: Date, default: Date.now },

  // ADMIN → MERCHANT transfer (after approval)
  adminToMerchantStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  adminToMerchantDescription: String,
  adminToMerchantTime: Date,

  // Final status
  overallStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },

  // Auto timestamp for creation
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);