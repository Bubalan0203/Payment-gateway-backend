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

// ✅ Process public payment: Payer → Admin (hold)
exports.processPayment = async (req, res) => {
  try {
    const { code, amount } = req.params;
    const { bankName, accountHolderName, accountNumber, ifsc, phoneNumber } = req.body;
    const amt = parseFloat(amount);

    console.log('💡 Received payment request for code:', code, 'amount:', amt);

    // 1. Validate payer (customer)
    const payer = await BankDetails.findOne({
      bankName,
      accountHolderName,
      accountNumber,
      ifsc,
      phoneNumber
    });

    if (!payer) {
      return res.status(400).json({
        error: '❌ Invalid Payer Bank Details: Check all fields (bankName, holderName, acc no, ifsc, phone).'
      });
    }

    // 2. Validate merchant (user with integration code)
    const merchant = await User.findOne({ uniqueCode: code });
    if (!merchant) {
      return res.status(403).json({ error: '❌ Invalid Merchant Code: No merchant found with this integration code.' });
    }
    if (!merchant.isActive) {
      return res.status(403).json({ error: '⚠️ Merchant is not active. Cannot process payments currently.' });
    }

    // 3. Validate merchant bank
    const merchantBank = await BankDetails.findOne({ accountNumber: merchant.bankAccountNumber });
    if (!merchantBank) {
      return res.status(500).json({ error: '❌ Merchant Bank Account not found. Merchant setup is incomplete.' });
    }

    // 4. Validate admin & admin bank
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(500).json({ error: '❌ Admin record missing in system. Contact support.' });
    }

    const adminBank = await BankDetails.findOne({ accountNumber: admin.bankAccountNumber });
    if (!adminBank) {
      return res.status(500).json({ error: '❌ Admin Bank Account not found. Contact support.' });
    }

    // 5. Insufficient balance
    if (payer.balance < amt) {
      const txn = new Transaction({
        integrationCode: code,
        fromAccountNumber: payer.accountNumber,
        toAccountNumber: merchant.bankAccountNumber,
        adminAccountNumber: adminBank.accountNumber,
        originalAmount: amt,
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

      await txn.save();

      return res.status(400).json({ error: '❌ Insufficient balance in your account.' });
    }

    // 6. Process transaction
    const commission = Math.floor(amt * 0.02);
    const netToMerchant = amt - commission;

    payer.balance -= amt;
    await payer.save();

    adminBank.balance += amt;
    await adminBank.save();

    const txn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchant.bankAccountNumber,
      adminAccountNumber: adminBank.accountNumber,
      originalAmount: amt,
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

    console.log('🧾 Transaction ready to be saved:', txn);

    try {
      await txn.save();
    } catch (err) {
      console.error('❌ Save failed:', err);
      return res.status(500).json({ error: 'Transaction failed to save', details: err.message });
    }

    res.json({
      message: '✅ Payment successful. Awaiting admin approval.',
      transaction: txn,
      merchantName: merchant.name,
      reference: txn._id.toString().slice(-8).toUpperCase()
    });

  } catch (err) {
    console.error('❌ Payment processing error:', err);
    res.status(500).json({ error: 'Internal server error. Please try again.', details: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    const { reason } = req.body;

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.overallStatus === 'failed') return res.status(400).json({ error: 'Already rejected' });

    const adminBank = await BankDetails.findOne({ accountNumber: txn.adminAccountNumber });
    const payerBank = await BankDetails.findOne({ accountNumber: txn.fromAccountNumber });

    if (!payerBank || !adminBank) return res.status(400).json({ error: 'Missing bank accounts' });

    const refundAmount = txn.originalAmount - txn.commission;

    if (adminBank.balance < refundAmount)
      return res.status(400).json({ error: 'Admin has insufficient balance to refund' });

    adminBank.balance -= refundAmount;
    payerBank.balance += refundAmount;
    await adminBank.save();
    await payerBank.save();

    txn.payeeToAdminStatus = 'refunded';
    txn.payeeToAdminDescription = 'Refunded to customer';
    txn.payeeToAdminTime = Date.now();
    txn.adminToMerchantStatus = 'failed';
    txn.adminToMerchantDescription = reason || 'Rejected by admin';
    txn.adminToMerchantTime = Date.now();
    txn.overallStatus = 'failed';
    await txn.save();

    res.json({ message: 'Transaction rejected and refunded to customer', txn });
  } catch (err) {
    res.status(500).json({ error: 'Internal error rejecting transaction' });
  }
};