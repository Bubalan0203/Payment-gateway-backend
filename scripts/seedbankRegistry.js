const mongoose = require('mongoose');
const connectDB = require('../config/db'); 
const BankRegistry = require('../models/BankRegistry');

const seedBanks = async () => {
  await connectDB();

  const banks = [
    {
      bankCode: 'HDFC',
      bankName: 'HDFC Bank',
      ifscPrefix: 'HDFC',
      upiDomain: 'hdfc',
      contactEmail: 'support@hdfc.com',
      supportUrl: 'https://support.hdfc.com'
    },
    {
      bankCode: 'SBI',
      bankName: 'State Bank of India',
      ifscPrefix: 'SBIN',
      upiDomain: 'sbi',
      contactEmail: 'support@sbi.co.in',
      supportUrl: 'https://www.sbi.co.in'
    },
    {
      bankCode: 'ICICI',
      bankName: 'ICICI Bank',
      ifscPrefix: 'ICIC',
      upiDomain: 'icici',
      contactEmail: 'support@icicibank.com',
      supportUrl: 'https://www.icicibank.com'
    },
    {
      bankCode: 'AXIS',
      bankName: 'Axis Bank',
      ifscPrefix: 'UTIB',
      upiDomain: 'axisbank',
      contactEmail: 'help@axisbank.com',
      supportUrl: 'https://www.axisbank.com'
    },
    {
      bankCode: 'PNB',
      bankName: 'Punjab National Bank',
      ifscPrefix: 'PUNB',
      upiDomain: 'pnb',
      contactEmail: 'support@pnb.co.in',
      supportUrl: 'https://www.pnbindia.in'
    }
  ];

  try {
    await BankRegistry.insertMany(banks);
    console.log('✅ Sample bank registry inserted');
  } catch (err) {
    console.error('❌ Error inserting:', err.message);
  }

  mongoose.disconnect();
};

seedBanks();
