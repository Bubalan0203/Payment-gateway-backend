import mongoose from 'mongoose';

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
  bankTransactionId: { type: String, required: true },

  // Step 2: Admin → Merchant
  adminToMerchantStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  adminToMerchantDescription: String,
  adminToMerchantTime: Date,
  settlementTransactionId: String,

  // Settlement Group
  settlementGroupId: { type: String, default: null },

  // Overall transaction state
  overallStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },

  // Customer Info
  customerId: { type: String, required: true },
  customerName: String,
  customerPhone: String,
  customerBankName: String,

  // Callback URLs
  currentUrl: { type: String, required: true },
  returnUrl: { type: String, required: true },

  createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
