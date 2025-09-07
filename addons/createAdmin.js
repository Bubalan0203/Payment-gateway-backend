const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AdminModel = require('../models/Admin.js');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/payment');

  const exists = await AdminModel.findOne({ email: 'suvetha@gmail.com' });
  if (exists) {
    console.log('Admin already exists');
    process.exit();
  }

  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = new AdminModel({
    email: 'suvetha@gmail.com',
    password: hashedPassword,
    bankAccountNumber: 'ACC0001'
  });

  await admin.save();
  console.log('Admin created');
  process.exit();
})();
