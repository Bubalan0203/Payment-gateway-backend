import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import AdminModel from '../models/Admin.js';

await mongoose.connect('mongodb://localhost:27017/');

const run = async () => {
  const exists = await AdminModel.findOne({ email: 'babloo@gmail.com' });
  if (exists) {
    console.log('Admin already exists');
    process.exit();
  }

  const hashedPassword = await bcrypt.hash('123', 10);

  const admin = new AdminModel({
    email: 'babloo@gmail.com',
    password: hashedPassword,
    bankAccountNumber: 'ACC0001'
  });

  await admin.save();
  console.log('Admin created');
  process.exit();
};

run();