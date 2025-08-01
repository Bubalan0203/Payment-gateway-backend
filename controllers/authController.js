const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secret123';

// 🔁 Generate UPI-style unique code within the user: rahul@paygate, rahul1@paygate, etc.
const generateUniqueCode = (name, existingCodes) => {
  const base = name.toLowerCase().replace(/\s+/g, '');
  let code = `${base}@paygate`;
  let count = 1;

  while (existingCodes.includes(code)) {
    code = `${base}${count}@paygate`;
    count++;
  }

  return code;
};

// ✳️ USER SIGNUP
exports.userSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      securityQuestion,
      securityAnswer,
      address,
      kyc
    } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      securityQuestion,
      securityAnswer,
      address,
      kyc,
      bankAccounts: [],
    });

    await user.save();

    res.status(201).json({ message: '✅ Signup successful. Awaiting admin approval.' });
  } catch (err) {
    console.error('Signup Error:', err.message);
    res.status(500).json({ error: 'Signup failed', details: err.message });
  }
};

// ➕ ADD BANK ACCOUNT (within user)
exports.addBankAccount = async (req, res) => {
  try {
    const {
      email,
      bankAccountNumber,
      bankName,
      accountHolderName,
      ifscCode,
      phoneNumber
    } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found with this email' });

    // ❌ Check if this user already added this account
    const existing = user.bankAccounts.find(acc => acc.bankAccountNumber === bankAccountNumber);
    if (existing) {
      return res.status(400).json({ error: 'Bank account already added for this user' });
    }

    // 🔁 Generate unique code within user's existing codes
    const existingCodes = user.bankAccounts.map(acc => acc.uniqueCode);
    const uniqueCode = generateUniqueCode(user.name, existingCodes);

    const newAccount = {
      bankAccountNumber,
      bankName,
      accountHolderName,
      ifscCode,
      phoneNumber,
      uniqueCode,
    };

    user.bankAccounts.push(newAccount);
    await user.save();

    res.status(200).json({
      message: '✅ Bank account added successfully',
      account: newAccount
    });
  } catch (err) {
    console.error('Add Bank Account Error:', err.message);
    res.status(500).json({ error: 'Failed to add bank account', details: err.message });
  }
};

// 🔐 USER LOGIN
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

// 🔐 ADMIN LOGIN
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
