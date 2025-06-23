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
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);