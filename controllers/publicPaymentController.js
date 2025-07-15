const User = require('../models/User');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');
const axios = require('axios');

// const BANK_API_BASE = 'http://localhost:5002/api/bank'; 
const BANK_API_BASE = 'https://paygatebank.onrender.com/api/bank';

// ✅ Validate integration code and active merchant
exports.getIntegrationByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const merchant = await User.findOne({ uniqueCode: code });

    if (!merchant) return res.status(404).json({ error: 'Invalid integration code' });
    if (!merchant.isActive) return res.status(403).json({ error: 'Merchant is not active' });

    res.json({ merchant: merchant.name, code });
  } catch (err) {
    console.error('Integration check error:', err);
    res.status(500).json({ error: 'Internal error validating integration code' });
  }
};

// ✅ Step 1: Check Merchant
const checkMerchant = async (code) => {
  const merchant = await User.findOne({ uniqueCode: code });
  if (!merchant) {
    throw new Error('❌ Invalid Merchant Code: No merchant found with this integration code.');
  }
  if (!merchant.isActive) {
    throw new Error('⚠️ Merchant is not active. Cannot process payments currently.');
  }
  return merchant;
};

// ✅ Step 2: Validate bank accounts (via bank-backend)
const validateBankAccounts = async (payerInfo, merchantAccNo, adminAccNo) => {
  try {
    const payerRes = await axios.post(`${BANK_API_BASE}/check`, payerInfo);
    if (!payerRes.data.valid) throw new Error('❌ Invalid payer bank details.');
    const payer = payerRes.data.account;

    const merchantRes = await axios.post(`${BANK_API_BASE}/check`, {
      accountNumber: merchantAccNo
    });
    if (!merchantRes.data.valid) throw new Error('❌ Merchant bank account not found.');
    const merchantBank = merchantRes.data.account;

    const adminRes = await axios.post(`${BANK_API_BASE}/check`, {
      accountNumber: adminAccNo
    });
    if (!adminRes.data.valid) throw new Error('❌ Admin bank account not found.');
    const adminBank = adminRes.data.account;

    return { payer, merchantBank, adminBank };
  } catch (err) {
    throw new Error(`🔁 Bank validation failed: ${err.response?.data?.error || err.message}`);
  }
};

// ✅ Step 3: Process Transaction using bank-backend `/transfer`
const processTransaction = async ({ payer, adminBank, merchant, amount, code, accountHolderName, phoneNumber, bankName }) => {
  if (payer.balance < amount) {
    const failedTxn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchant.bankAccountNumber,
      adminAccountNumber: adminBank.accountNumber,
      originalAmount: amount,
      commission: 0,
      amountToMerchant: 0,
      payeeToAdminStatus: 'failed',
      payeeToAdminDescription: 'Insufficient balance',
      adminToMerchantStatus: 'failed',
      adminToMerchantDescription: 'Not applicable',
      overallStatus: 'failed',
      customerName: accountHolderName,
      customerPhone: phoneNumber,
      customerBankName: bankName
    });
    await failedTxn.save();
    return { status: 'failed', reason: '❌ Insufficient balance in your account.' };
  }

  const commission = Math.floor(amount * 0.02);
  const netToMerchant = amount - commission;

  try {
    const transferRes = await axios.post(`${BANK_API_BASE}/transfer`, {
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: adminBank.accountNumber,
      amount
    });

    if (transferRes.data.status !== 'success') {
      return {
        status: 'failed',
        reason: `❌ Transfer failed: ${transferRes.data.message}`
      };
    }

    const txn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchant.bankAccountNumber,
      adminAccountNumber: adminBank.accountNumber,
      originalAmount: amount,
      commission,
      amountToMerchant: netToMerchant,
      payeeToAdminStatus: 'success',
      payeeToAdminDescription: 'Payment received by admin',
      adminToMerchantStatus: 'pending',
      adminToMerchantDescription: 'Awaiting admin approval',
      overallStatus: 'pending',
      customerName: accountHolderName,
      customerPhone: phoneNumber,
      customerBankName: bankName,
      bankTransactionId: transferRes.data.transactionId || `BANKTXN-${Date.now()}`
    });

    await txn.save();

    return {
      status: 'success',
      transaction: txn,
      merchantName: merchant.name,
      reference: txn._id.toString().slice(-8).toUpperCase()
    };
  } catch (err) {
    throw new Error(`❌ Bank transfer error: ${err.response?.data?.error || err.message}`);
  }
};

// ✅ Final controller: processPayment
exports.processPayment = async (req, res) => {
  try {
    const { code, amount } = req.params;
    const payerInfo = req.body;
    const amt = parseFloat(amount);

    console.log('💡 Received payment request for code:', code, 'amount:', amt);

    const merchant = await checkMerchant(code);
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(500).json({ error: '❌ Admin record missing in system. Contact support.' });
    }

    const { payer, merchantBank, adminBank } = await validateBankAccounts(
      payerInfo,
      merchant.bankAccountNumber,
      admin.bankAccountNumber
    );

    const txnResult = await processTransaction({
      payer,
      adminBank,
      merchant,
      amount: amt,
      code,
      accountHolderName: payerInfo.accountHolderName,
      phoneNumber: payerInfo.phoneNumber,
      bankName: payerInfo.bankName
    });

    if (txnResult.status === 'failed') {
      return res.status(400).json({ error: txnResult.reason });
    }

    return res.json({
      message: '✅ Payment successful. Awaiting admin approval.',
      transaction: txnResult.transaction,
      merchantName: txnResult.merchantName,
      reference: txnResult.reference
    });

  } catch (err) {
    console.error('❌ Payment error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};