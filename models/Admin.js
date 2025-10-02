import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  bankAccountNumber: String
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
