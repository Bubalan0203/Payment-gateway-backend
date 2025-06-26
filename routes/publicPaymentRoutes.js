const express = require('express');
const router = express.Router();
const publicPaymentController = require('../controllers/publicPaymentController');

router.post('/pay/:code/:amount', publicPaymentController.processPayment);

module.exports = router;
