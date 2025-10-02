import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import requestLogger from './middleware/logger.js';
import trafficMonitor from './middleware/trafficMonitor.js';
import rateLimiter from './middleware/rateLimiter.js';

// Import routes (ES module style)
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import publicPaymentRoutes from './routes/publicPaymentRoutes.js';
import logRoutes from './routes/logRoutes.js';

const app = express();

// ✅ Allow all IPs
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// DB connection
connectDB();

// ✅ Apply rate limiter and traffic monitoring
app.use(rateLimiter);
app.use(trafficMonitor);

// ✅ Logger middleware
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicPaymentRoutes);
app.use('/api/logs', logRoutes);

// Example endpoint to check traffic info
app.get('/api/traffic-stats', (req, res) => {
  res.json({
    requestsPerSecond: req.requestsPerSecond,
    requestsPerMinute: req.requestsPerMinute
  });
});

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
