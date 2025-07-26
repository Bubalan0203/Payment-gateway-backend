const User = require('../models/User');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');
const axios = require('axios');

const BANK_API_BASE = 'http://localhost:5002/api/bank';

// ✅ Validate integration code and active merchant (based on email)
exports.getIntegrationByCode = async (req, res) => {
  const { email, code } = req.params;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(400).json({ error: 'Merchant not found or not active' });
    }

    const matchedBank = user.bankAccounts.find(acc => acc.uniqueCode === code);

    if (!matchedBank) {
      return res.status(404).json({ error: 'Invalid unique code' });
    }

    return res.json({
      merchant: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      bankAccount: matchedBank
    });
  } catch (err) {
    console.error('Integration lookup error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Step 1: Check Merchant (based on uniqueCode + email)
const checkMerchant = async (code, email) => {
  console.log('🔍 [checkMerchant] Looking for user with email:', email);
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    throw new Error('❌ Merchant not found or inactive');
  }

  console.log('🔍 [checkMerchant] Found user. Now matching code:', code);
  const matchedBank = user.bankAccounts.find(acc => {
    console.log('➡️ Comparing with:', acc.uniqueCode);
    return acc.uniqueCode.trim() === code.trim();
  });

  if (!matchedBank) {
    console.error('❌ No bank matched for code:', code);
    throw new Error('❌ Invalid unique code');
  }

  console.log('✅ [checkMerchant] Matched bank:', matchedBank.bankAccountNumber);

  return { merchant: user, merchantBankAccount: matchedBank };
};


const validateBankAccounts = async (payerAccNo, merchantAccNo, adminAccNo) => {
  try {
    const payerRes = await axios.post(`${BANK_API_BASE}/check`, {
      accountNumber: payerAccNo
    });
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




// ✅ Final Controller: Process Payment (POST /api/public/pay/:email/:code/:amount)
exports.processPayment = async (req, res) => {
  try {
    const { code, amount, email } = req.params;
    const payerInfo = req.body;
    const amt = parseFloat(amount);

    console.log('💡 [STEP 1] Payment request received');
    console.log('📨 Email:', email);
    console.log('🔐 Code:', code);
    console.log('💰 Amount:', amt);
    console.log('👤 Payer Info:', payerInfo);
     console.log('👤 Payer Info:', payerInfo.accountNumber);

    // Step 1: Get merchant and their bank account
    const { merchant, merchantBankAccount } = await checkMerchant(code, email);
    console.log('✅ [STEP 2] Merchant verified:', merchant.email);
    console.log('🏦 Merchant Bank Account:', merchantBankAccount.bankAccountNumber);

    // Step 2: Get admin record
    const admin = await Admin.findOne();
    if (!admin) {
      console.error('❌ Admin not found in DB');
      return res.status(500).json({ error: 'Admin record missing. Contact support.' });
    }
    console.log('👨‍💼 Admin Account:', admin.bankAccountNumber);

    // Step 3: Validate all 3 bank accounts
   const { payer, merchantBank, adminBank } = await validateBankAccounts(
  payerInfo.accountNumber,
  merchantBankAccount.bankAccountNumber,
  admin.bankAccountNumber
);


    console.log('✅ [STEP 3] Bank validation successful');
    console.log('🧾 Payer:', payer);
    console.log('🏦 Merchant Bank:', merchantBank);
    console.log('🏛️ Admin Bank:', adminBank);

    // Step 4: Process the transaction
    const txnResult = await processTransaction({
      payer,
      adminBank,
      merchant,
      merchantBankAccount,
      amount: amt,
      code,
      accountHolderName: payerInfo.accountHolderName,
      phoneNumber: payerInfo.phoneNumber,
      bankName: payerInfo.bankName
    });

    // Step 5: Check transaction result
    if (txnResult.status === 'failed') {
      console.warn('⚠️ Payment failed:', txnResult.reason);
      return res.status(400).json({ error: txnResult.reason });
    }

    console.log('✅ [STEP 4] Transaction recorded:', txnResult.transaction._id);

    // Step 6: Send success response
    return res.json({
      message: '✅ Payment successful. Awaiting admin approval.',
      transaction: txnResult.transaction,
      merchantName: txnResult.merchantName,
      reference: txnResult.reference
    });

  } catch (err) {
    console.error('❌ [ERROR] Payment processing failed:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};




// ✅ Step 3: Process Transaction
const processTransaction = async ({ payer, adminBank, merchant, merchantBankAccount, amount, code, accountHolderName, phoneNumber, bankName }) => {
  if (payer.balance < amount) {
    const failedTxn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchantBankAccount.bankAccountNumber,
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
      toAccountNumber: merchantBankAccount.bankAccountNumber,
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