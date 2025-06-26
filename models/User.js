const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, required: true }, // ✅ Phone number added
  password: String,
  bankAccountNumber: String,
  uniqueCode: { type: String, unique: true, required: true }, // ✅ Set manually like username@paygate
  isActive: { type: Boolean, default: false },

  // New fields
  securityQuestion: String,
  securityAnswer: String,

  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    zip: String,
  },

  kyc: {
    panCardNumber: String,
    aadhaarNumber: String,
  }
});

module.exports = mongoose.model('User', userSchema);