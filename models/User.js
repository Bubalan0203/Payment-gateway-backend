// models/User.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  bankAccountNumber: String,
  uniqueCode: { type: String, default: uuidv4 },
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
