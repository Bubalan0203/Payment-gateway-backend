import express from 'express';
const router = express.Router();

import RequestLog from '../models/RequestLog.js';

// GET all logs (you can add pagination later)
router.get('/', async (req, res) => {
  try {
    const logs = await RequestLog.find().sort({ requestTime: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
