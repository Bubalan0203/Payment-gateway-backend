const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');

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

// ✅ Step 2: Check Bank Accounts (payer, admin, merchant)
const checkBankAccounts = async ({ bankName, accountHolderName, accountNumber, ifsc, phoneNumber }, merchantAccountNumber, adminAccountNumber) => {
  const payer = await BankDetails.findOne({ bankName, accountHolderName, accountNumber, ifsc, phoneNumber });
  if (!payer) {
    throw new Error('❌ Invalid Payer Bank Details: Check all fields (bankName, holderName, acc no, ifsc, phone).');
  }

  const merchantBank = await BankDetails.findOne({ accountNumber: merchantAccountNumber });
  if (!merchantBank) {
    throw new Error('❌ Merchant Bank Account not found. Merchant setup is incomplete.');
  }

  const adminBank = await BankDetails.findOne({ accountNumber: adminAccountNumber });
  if (!adminBank) {
    throw new Error('❌ Admin Bank Account not found. Contact support.');
  }

  return { payer, merchantBank, adminBank };
};

// ✅ Step 3: Process Transaction
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

  payer.balance -= amount;
  await payer.save();

  adminBank.balance += amount;
  await adminBank.save();

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
    customerBankName: bankName
  });

  await txn.save();

  return {
    status: 'success',
    transaction: txn,
    merchantName: merchant.name,
    reference: txn._id.toString().slice(-8).toUpperCase()
  };
};

// ✅ Main Controller: processPayment
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

    const { payer, merchantBank, adminBank } = await checkBankAccounts(payerInfo, merchant.bankAccountNumber, admin.bankAccountNumber);

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
    console.error('❌ Payment error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

