// models/User.js
const mongoose = require('mongoose');
const bankAccountSchema = require('./BankAccount');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, required: true },
  password: String,
  bankAccounts: [bankAccountSchema],
  siteUrls: [ // <-- NEW FIELD
    {
      url: { type: String, required: true },
      addedAt: { type: Date, default: Date.now }
    }
  ],
  isActive: { type: Boolean, default: false },
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
