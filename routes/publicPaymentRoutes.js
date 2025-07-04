const express = require('express');
const router = express.Router();
const { getIntegrationByCode, processPayment } = require('../controllers/publicPaymentController');
const Transaction = require('../models/Transaction');

// ✅ Public: Validate integration code (used by frontend before rendering payment form)
router.get('/integration/:code', getIntegrationByCode);

// ✅ Process a payment
router.post('/pay/:code/:amount', processPayment);

// ✅ Admin: Get all transactions
router.get('/all-transactions', async (req, res) => {
  const txns = await Transaction.find().sort({ timestamp: -1 });
  res.json(txns);
});

// ✅ Merchant/User: Get transactions by their bank account number
router.get('/user-transactions/:accountNumber', async (req, res) => {
  const txns = await Transaction.find({ toAccountNumber: req.params.accountNumber }).sort({ timestamp: -1 });
  res.json(txns);
});

module.exports = router;