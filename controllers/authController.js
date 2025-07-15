const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secret123';

// Utility: Generate UPI-style unique code
const generateUniqueCode = async (name) => {
  const base = name.toLowerCase().replace(/\s+/g, '') + '@paygate';
  let code = base;
  let count = 0;

  while (await User.findOne({ uniqueCode: code })) {
    count++;
    code = base.replace('@paygate', `${count}@paygate`);
  }

  return code;
};

/* 🔄 Reusable Helper */

// ✅ Check if a bank account exists
const checkBankAccountExists = async (accountNumber) => {
  const bank = await BankDetails.findOne({ accountNumber });
  if (!bank) {
    throw new Error('❌ Bank account not found. Please check account number.');
  }
  return bank;
};

/* 🧾 User Signup Controller */

exports.userSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      securityQuestion,
      securityAnswer,
      bankAccountNumber,
      bankName,                  // ✅
      accountHolderName,         // ✅
      address,
      kyc
    } = req.body;

    // ✅ Check if bank exists
    await checkBankAccountExists(bankAccountNumber);

    // ✅ Check for existing user
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Generate uniqueCode (UPI-style)
    const uniqueCode = await generateUniqueCode(name);

    // ✅ Create and save user
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      bankAccountNumber,
      bankName,
      accountHolderName,
      uniqueCode,
      securityQuestion,
      securityAnswer,
      address,
      kyc
    });

    await user.save();

    res.status(201).json({ message: '✅ Signup successful. Awaiting admin approval.' });
  } catch (err) {
    console.error('Signup Error:', err.message);
    res.status(500).json({ error: 'Signup failed', details: err.message });
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    if (!user.isActive) return res.status(403).json({ error: 'User not approved yet' });

    const token = jwt.sign({ id: user._id, type: 'user' }, JWT_SECRET, { expiresIn: '2h' });

    res.json({ message: 'Login successful', user, token });
  } catch (err) {
    res.status(500).json({ error: 'Login error', details: err.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: 'Invalid admin credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    const token = jwt.sign({ id: admin._id, type: 'admin' }, JWT_SECRET, { expiresIn: '2h' });

    res.json({ message: 'Admin login successful', admin, token });
  } catch (err) {
    res.status(500).json({ error: 'Admin login failed', details: err.message });
  }
};