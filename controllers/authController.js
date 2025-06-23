// controllers/authController.js
const User = require('../models/User');
const Admin = require('../models/Admin');
const BankDetails = require('../models/BankDetails');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secret123';

exports.userSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      securityQuestion,
      securityAnswer,
      bankAccountNumber,
      address,
      kyc
    } = req.body;

    const bank = await BankDetails.findOne({ accountNumber: bankAccountNumber });
    if (!bank) return res.status(400).json({ error: 'Bank account not found' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      bankAccountNumber,
      securityQuestion,
      securityAnswer,
      address,
      kyc
    });
    await user.save();

    res.status(201).json({ message: 'Signup successful. Awaiting admin approval.' });
  } catch (err) {
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