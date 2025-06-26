const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');

// Load bank registry for inter-bank simulation
const bankRegistry = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/bankRegistry.json'), 'utf-8')
);

// Controller to process payments
exports.processPayment = async (req, res) => {
  try {
    const { code, amount } = req.params;
    const { name, accountNumber, ifsc } = req.body;
    const amt = parseFloat(amount);

    // Validate payer
   const payer = await BankDetails.findOne({ name, accountNumber, ifsc });
if (!payer) {
  return res.status(400).json({ error: 'Invalid payer bank details' });
}

// safe to access .balance now
if (payer.balance < amt) {
  return res.status(400).json({ error: 'Insufficient balance' });
}


    // Validate merchant
    const merchant = await User.findOne({ uniqueCode: code });
    if (!merchant || !merchant.isActive)
      return res.status(403).json({ error: 'Invalid or inactive integration code' });

    // Get merchant and admin bank details
    const merchantBank = await BankDetails.findOne({ accountNumber: merchant.bankAccountNumber });
    const admin = await Admin.findOne();
    const adminBank = await BankDetails.findOne({ accountNumber: admin?.bankAccountNumber });

    const commission = amt * 0.02;
    const netToMerchant = amt - commission;
    const isSameBank = payer.bankCode === merchantBank?.bankCode;

    // Deduct from payer
    payer.balance -= amt;
    await payer.save();

    let transferStatus = 'success';
    let externalReferenceId = null;
    let routingStatus = null;

    if (isSameBank) {
      merchantBank.balance += netToMerchant;
      adminBank.balance += commission;
      await merchantBank.save();
      await adminBank.save();
      routingStatus = 'internal';
    } else {
      const registryEntry = bankRegistry.find(b => b.bankCode === merchantBank?.bankCode);
      if (!registryEntry || registryEntry.status !== 'ACTIVE') {
        payer.balance += netToMerchant;
        await payer.save();

        await new Transaction({
          integrationCode: code,
          fromAccountNumber: payer.accountNumber,
          toAccountNumber: merchantBank?.accountNumber || 'N/A',
          adminAccountNumber: adminBank?.accountNumber || 'N/A',
          originalAmount: amt,
          commission,
          amountToMerchant: 0,
          status: 'failed',
          transferType: 'INTER_BANK',
          routingStatus: 'bank_unavailable'
        }).save();

        return res.status(500).json({
          error: `Merchant bank unavailable. ₹${netToMerchant} refunded.`
        });
      }

      externalReferenceId = `UTR${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      routingStatus = 'routed-via-npci';

      merchantBank.balance += netToMerchant;
      adminBank.balance += commission;
      await merchantBank.save();
      await adminBank.save();
    }

    // Save transaction
    const txn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchantBank?.accountNumber || 'N/A',
      adminAccountNumber: adminBank?.accountNumber || 'N/A',
      originalAmount: amt,
      commission,
      amountToMerchant: netToMerchant,
      status: transferStatus,
      transferType: isSameBank ? 'SAME_BANK' : 'INTER_BANK',
      externalReferenceId,
      routingStatus
    });

    await txn.save();

    res.json({
      message: 'Payment processed',
      transaction: txn,
      merchantName: merchant.name,
      reference: externalReferenceId
    });

  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Internal processing error', details: err.message });
  }
};
