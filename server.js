const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// ✅ CORS enabled (good for frontend connection)
app.use(cors());

// ✅ JSON parser added before routes
app.use(express.json());

// ✅ MongoDB connection
connectDB();

// ✅ Routes properly registered
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/public', require('./routes/publicPaymentRoutes'));

// ✅ Server listening on port 5001
app.listen(5001, () => {
  console.log('Server running on port 5001');
});
