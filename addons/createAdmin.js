import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import AdminModel from '../models/Admin.js';

await mongoose.connect('mongodb+srv://bubalan2803:BIlqLRWkn3rQIBwT@cluster0.s96ucjm.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');

const run = async () => {
  const exists = await AdminModel.findOne({ email: 'bubalan@gmail.com' });
  if (exists) {
    console.log('Admin already exists');
    process.exit();
  }

  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = new AdminModel({
    email: 'bubalan@gmail.com',
    password: hashedPassword,
    bankAccountNumber: 'ACC0001'
  });

  await admin.save();
  console.log('Admin created');
  process.exit();
};

run();