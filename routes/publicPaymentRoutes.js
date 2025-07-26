const express = require('express');
const router = express.Router();
const { getIntegrationByCode, processPayment } = require('../controllers/publicPaymentController');
const Transaction = require('../models/Transaction');

// ✅ Validate integration code with email
router.get('/integration/:email/:code', getIntegrationByCode);

// ✅ Process a payment (email added)
router.post('/pay/:email/:code/:amount', processPayment);

// ✅ Admin: Get all transactions
router.get('/all-transactions', async (req, res) => {
  const txns = await Transaction.find().sort({ createdAt: -1 });
  res.json(txns);
});

// ✅ Merchant/User: Get transactions by account number
router.get('/user-transactions/:accountNumber', async (req, res) => {
  const txns = await Transaction.find({ toAccountNumber: req.params.accountNumber }).sort({ createdAt: -1 });
  res.json(txns);
});

module.exports = router;
