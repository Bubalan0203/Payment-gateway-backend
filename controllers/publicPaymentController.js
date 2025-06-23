const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');

// ✅ Validate integration code and active merchant
exports.getIntegrationByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const merchant = await User.findOne({ uniqueCode: code });

    if (!merchant) {
      return res.status(404).json({ error: 'Invalid integration code' });
    }

    if (!merchant.isActive) {
      return res.status(403).json({ error: 'Merchant is not active' });
    }

    res.json({ merchant: merchant.name, code });
  } catch (err) {
    console.error('Integration check error:', err);
    res.status(500).json({ error: 'Internal error validating integration code' });
  }
};

// ✅ Main payment processing logic
exports.processPayment = async (req, res) => {
  try {
    const { code, amount } = req.params;
    const { name, accountNumber, ifsc } = req.body;
    const amt = parseFloat(amount);

    // 1. Validate payer's bank
    const payer = await BankDetails.findOne({ accountNumber, name, ifsc });
    if (!payer) return res.status(400).json({ error: 'Invalid payer bank details' });
    if (payer.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });

    // 2. Validate merchant
    const merchant = await User.findOne({ uniqueCode: code });
    if (!merchant || !merchant.isActive) {
      return res.status(403).json({ error: 'Invalid or inactive integration code' });
    }

    // 3. Fetch bank accounts
    const merchantBank = await BankDetails.findOne({ accountNumber: merchant.bankAccountNumber });
    const admin = await Admin.findOne();
    const adminBank = await BankDetails.findOne({ accountNumber: admin?.bankAccountNumber });

    const commission = amt * 0.02;
    const netToMerchant = amt - commission;

    // 4. Withdraw from payer (deduct total)
    payer.balance -= amt;
    await payer.save();

    // 5. If merchant/admin bank missing → refund (minus commission)
    if (!merchantBank || !adminBank) {
      payer.balance += netToMerchant;
      await payer.save();

      await new Transaction({
        integrationCode: code,
        fromAccountNumber: payer.accountNumber,
        toAccountNumber: merchant?.bankAccountNumber || 'N/A',
        adminAccountNumber: admin?.bankAccountNumber || 'N/A',
        originalAmount: amt,
        commission,
        amountToMerchant: 0,
        status: 'failed'
      }).save();

      return res.status(500).json({
        error: `Transaction failed. ₹${netToMerchant} refunded after 2% commission deduction.`
      });
    }

    // 6. Distribute amounts
    adminBank.balance += commission;
    merchantBank.balance += netToMerchant;

    await adminBank.save();
    await merchantBank.save();

    const txn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchantBank.accountNumber,
      adminAccountNumber: adminBank.accountNumber,
      originalAmount: amt,
      commission,
      amountToMerchant: netToMerchant,
      status: 'success'
    });

    await txn.save();

    res.json({ message: 'Payment successful', transaction: txn });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Payment failed internally', details: err.message });
  }
};