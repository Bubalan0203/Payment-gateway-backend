const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  // Account holder name
  name: { type: String, required: true },

  // Unique account number
  accountNumber: { type: String, unique: true, required: true },

  // IFSC code (used for routing and identification)
  ifsc: { type: String, required: true },

  // Current account balance
  balance: { type: Number, default: 0 },

  // Linked user reference
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Type of account
  accountType: {
    type: String,
    enum: ['SAVINGS', 'CURRENT', 'LOAN'],
    default: 'SAVINGS'
  },

  // Bank identification fields (used in routing)
  bankCode: { type: String, required: true },     // e.g., 'HDFC', 'SBI'
  bankName: { type: String, required: true },     // e.g., 'HDFC Bank'

  // UPI handle (unique per account)
  upiId: {
    type: String,
    unique: true,
    required: true,
    match: /^[\w.\-]{2,256}@[a-z]{2,15}$/i
  },

  // Account lifecycle status
  status: {
    type: String,
    enum: ['ACTIVE', 'FROZEN', 'CLOSED'],
    default: 'ACTIVE'
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt timestamp
bankDetailsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
