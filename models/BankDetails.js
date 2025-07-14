const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true
  },
  accountHolderName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true
  },
  ifsc: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('BankDetails', bankDetailsSchema);