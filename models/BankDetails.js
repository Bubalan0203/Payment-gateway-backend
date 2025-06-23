const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  name: String,
  accountNumber: { type: String, unique: true },
  ifsc: String,
  balance: Number
});

module.exports = mongoose.model('BankDetails', bankDetailsSchema);