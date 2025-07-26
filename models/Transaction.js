const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  integrationCode: String,
  fromAccountNumber: String,
  toAccountNumber: String,
  adminAccountNumber: String,

  originalAmount: Number,
  commission: Number,
  amountToMerchant: Number,

  // Step 1: Payer → Admin
  payeeToAdminStatus: {
    type: String,
    enum: ['success', 'failed', 'refunded'],
    default: 'success'
  },
  payeeToAdminDescription: String,
  payeeToAdminTime: { type: Date, default: Date.now },
  bankTransactionId: { type: String, required: true }, // ✅ Payer → Admin

  // Step 2: Admin → Merchant
  adminToMerchantStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  adminToMerchantDescription: String,
  adminToMerchantTime: Date,
  settlementTransactionId: { type: String }, // ✅ Admin → Merchant

  // Final overall status
  overallStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },

  customerName: String,
  customerPhone: String,
  customerBankName: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
