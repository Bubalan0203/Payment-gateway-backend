const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  integrationCode: String,
  fromAccountNumber: String,
  toAccountNumber: String,
  adminAccountNumber: String,
  originalAmount: Number,
  commission: Number,
  amountToMerchant: Number,
  status: String,
  transferType: {
    type: String,
    enum: ['SAME_BANK', 'INTER_BANK'],
    default: 'SAME_BANK'
  },
  externalReferenceId: String,
  routingStatus: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
