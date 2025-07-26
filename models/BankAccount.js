// models/BankAccount.js
const mongoose = require('mongoose');

// ✅ Corrected bankAccountSchema
const bankAccountSchema = new mongoose.Schema({
  bankAccountNumber: { type: String, required: true },
  bankName: String,
  accountHolderName: String,
  ifscCode: String,
  phoneNumber: String,
  uniqueCode: { type: String, required: true } // 🚫 Don't add unique: true here!
});


module.exports = bankAccountSchema;
