// models/BankRegistry.js
const mongoose = require('mongoose');

const bankRegistrySchema = new mongoose.Schema({
  bankCode: {
    type: String,
    required: true,
    unique: true, // e.g., HDFC, SBI
    uppercase: true
  },
  bankName: {
    type: String,
    required: true
  },
  ifscPrefix: {
    type: String,
    required: true // e.g., HDFC, SBIN
  },
  upiDomain: {
    type: String,
    required: true // e.g., hdfc, sbi
  },
  isLive: {
    type: Boolean,
    default: true
  },
  settlementType: {
    type: String,
    enum: ['NPCI', 'RBI', 'INTERNAL'],
    default: 'NPCI'
  },
  contactEmail: String,
  supportUrl: String
});

module.exports = mongoose.model('BankRegistry', bankRegistrySchema);
