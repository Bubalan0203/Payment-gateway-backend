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
    const { name, accountNumber, ifsc } = req.body;
    const amt = parseFloat(amount);

    // 1. Validate payer (customer) bank
    const payer = await BankDetails.findOne({ accountNumber, name, ifsc });
    if (!payer) return res.status(400).json({ error: 'Invalid payer bank details' });

    // 2. Validate merchant
    const merchant = await User.findOne({ uniqueCode: code });
    if (!merchant || !merchant.isActive)
      return res.status(403).json({ error: 'Invalid or inactive integration code' });

    const merchantBank = await BankDetails.findOne({ accountNumber: merchant.bankAccountNumber });
    const admin = await Admin.findOne();
    const adminBank = await BankDetails.findOne({ accountNumber: admin?.bankAccountNumber });

    // 3. If insufficient balance → DO NOT transfer anything, record failure
    if (payer.balance < amt) {
      const txn = new Transaction({
        integrationCode: code,
        fromAccountNumber: payer.accountNumber,
        toAccountNumber: merchant.bankAccountNumber,
        adminAccountNumber: adminBank?.accountNumber || 'NA',
        originalAmount: amt,
        commission: 0,
        amountToMerchant: 0,
        payeeToAdminStatus: 'failed',
        payeeToAdminDescription: 'Insufficient balance on payee',
        payeeToAdminTime: Date.now(),
        adminToMerchantStatus: 'failed',
        adminToMerchantDescription: 'Not applicable',
        overallStatus: 'failed'
      });
      await txn.save();
      return res.status(400).json({ error: 'Insufficient balance on payee' });
    }

    // 4. Commission + Net Calc
    const commission = Math.floor(amt * 0.02);
    const netToMerchant = amt - commission;

    // 5. Deduct from payer
    payer.balance -= amt;
    await payer.save();

    // 6. Admin not found — refund
    if (!adminBank) {
      payer.balance += amt;
      await payer.save();
      return res.status(500).json({ error: 'Admin bank unavailable. Transaction reversed.' });
    }

    // 7. Credit to Admin
    adminBank.balance += amt;
    await adminBank.save();

    // 8. Save successful transaction
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
      payeeToAdminTime: Date.now(),
      adminToMerchantStatus: 'pending',
      adminToMerchantDescription: 'Awaiting admin approval',
      overallStatus: 'pending'
    });

    await txn.save();

    res.json({ message: 'Payment processed. Awaiting admin approval.', transaction: txn });

  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ error: 'Internal error processing payment', details: err.message });
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