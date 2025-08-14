// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const os = require('os');
// const { execSync } = require('child_process');
// const connectDB = require('./config/db');

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Allowed MAC addresses
// const allowedMACs = [
//   "4e:9a:c3:95:ce:38",
//   "76:18:f4:5a:28:11",
//   "3e:64:40:b5:1a:f8",
//   "10:bd:3a:6a:cc:bc",
//   "00:45:E2:82:B0:AD",
//   "28:c5:d2:2c:bb:f4",
//   "50:c2:e8:17:9a:63",
//   "00:45:e2:82:b0:ad",
//   "d0:39:57:01:14:a7",
//   "f2:ba:ab:59:52:14"
// ];

// // Function to get MAC from IP using ARP
// function getMACFromIP(ip) {
//   try {
//     const arpOutput = execSync(`arp -n ${ip}`).toString();
//     const match = arpOutput.match(/(([a-f0-9]{2}:){5}[a-f0-9]{2})/i);
//     return match ? match[0].toLowerCase() : null;
//   } catch {
//     return null;
//   }
// }

// // Function to get local MAC address (for localhost testing)
// function getLocalMAC() {
//   const interfaces = os.networkInterfaces();
//   for (const name in interfaces) {
//     for (const net of interfaces[name]) {
//       if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
//         return net.mac.toLowerCase();
//       }
//     }
//   }
//   return null;
// }

// // Middleware to check MAC address
// app.use((req, res, next) => {
//   let clientIP = req.ip || req.connection.remoteAddress;
//   clientIP = clientIP.replace('::ffff:', '');

//   let mac;

//   if (clientIP === '::1' || clientIP === '127.0.0.1') {
//     // Localhost request - get system MAC
//     mac = getLocalMAC();
//     console.log(`Local request detected. Using local MAC: ${mac}`);
//   } else {
//     // Try to get MAC via ARP for LAN requests
//     mac = getMACFromIP(clientIP);
//     if (!mac) {
//       console.log(`Could not get MAC for IP: ${clientIP}`);
//       return res.status(403).json({ error: 'Access denied' });
//     }
//   }

//   if (!allowedMACs.includes(mac)) {
//     console.log(`Unauthorized MAC tried to access: ${mac}`);
//     return res.status(403).json({ error: 'Access denied' });
//   }

//   next();
// });

// // DB connection
// connectDB();

// // Routes
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));
// app.use('/api/public', require('./routes/publicPaymentRoutes'));

// app.listen(5001, () => {
//   console.log('Server running on port 5001');
// });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// DB connection
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/public', require('./routes/publicPaymentRoutes'));

app.listen(5001, () => {
  console.log('Server running on port 5001');
});