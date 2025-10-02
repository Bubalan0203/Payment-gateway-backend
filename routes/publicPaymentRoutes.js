import express from 'express';
const router = express.Router();

import { getIntegrationByCode, processPayment } from '../controllers/publicPaymentController.js';
import Transaction from '../models/Transaction.js';
import CustomerData from '../models/Customer.js';
import paymentRateLimiter from '../middleware/paymentRateLimiter.js';

// Validate integration code
router.get('/integration/:email/:code', getIntegrationByCode);

// Process payment (with conditional rate limiting)
router.post('/pay/:email/:code/:amount', paymentRateLimiter, processPayment);

// Admin: Get all transactions
router.get('/all-transactions', async (req, res) => {
  const txns = await Transaction.find().sort({ createdAt: -1 });
  res.json(txns);
});

// Admin: Get all customers
router.get('/all-customers', async (req, res) => {
  try {
    const customers = await CustomerData.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User: Get transactions by account number
router.get('/user-transactions/:accountNumber', async (req, res) => {
  const txns = await Transaction.find({ toAccountNumber: req.params.accountNumber }).sort({ createdAt: -1 });
  res.json(txns);
});

export default router;
