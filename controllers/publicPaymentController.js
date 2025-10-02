import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Transaction from '../models/Transaction.js';
import CustomerData from '../models/Customer.js';
import axios from 'axios';
import { decrypt, encrypt } from './cryptoUtil.js';

const BANK_API_BASE = 'http://192.168.162.154:5000';
// const BANK_API_BASE = 'http://10.165.17.93:5000';
// const BANK_API_BASE = 'http://localhost:5003';

// ✅ Validate integration code and active merchant (based on email)
export const getIntegrationByCode = async (req, res) => {
  const { email, code } = req.params;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(400).json({ error: 'Merchant not found or not active' });
    }

    const matchedBank = user.bankAccounts.find(acc => acc.uniqueCode === code);

    if (!matchedBank) {
      return res.status(404).json({ error: 'Invalid unique code' });
    }

    return res.json({
      merchant: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      bankAccount: matchedBank
    });
  } catch (err) {
    console.error('Integration lookup error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Step 1: Check Merchant (based on uniqueCode + email)
const checkMerchant = async (code, email, currentUrl) => {
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    throw new Error('❌ Merchant not found or inactive');
  }

  const matchedBank = user.bankAccounts.find(acc => acc.uniqueCode.trim() === code.trim());
  if (!matchedBank) throw new Error('❌ Invalid unique code');

  const siteExists = user.siteUrls.some(s => s.url.trim() === currentUrl.trim());
  if (!siteExists) throw new Error('❌ Unauthorized site. Transaction blocked.');

  return { merchant: user, merchantBankAccount: matchedBank };
};

// ✅ Validate payer, merchant, and admin bank accounts
const validateBankAccounts = async (payerAccNo, merchantAccNo, adminAccNo) => {
  try {
    const payerRes = await axios.post(`${BANK_API_BASE}/check`, { payload: encrypt({ accountNumber: payerAccNo }) });
    const payerDecrypted = decrypt(payerRes.data);
    if (!payerDecrypted.valid) throw new Error('❌ Invalid payer bank details.');
    const payer = payerDecrypted.account;

    const merchantRes = await axios.post(`${BANK_API_BASE}/check`, { payload: encrypt({ accountNumber: merchantAccNo }) });
    const merchantDecrypted = decrypt(merchantRes.data);
    if (!merchantDecrypted.valid) throw new Error('❌ Merchant bank account not found.');
    const merchantBank = merchantDecrypted.account;

    const adminRes = await axios.post(`${BANK_API_BASE}/check`, { payload: encrypt({ accountNumber: adminAccNo }) });
    const adminDecrypted = decrypt(adminRes.data);
    if (!adminDecrypted.valid) throw new Error('❌ Admin bank account not found.');
    const adminBank = adminDecrypted.account;

    return { payer, merchantBank, adminBank };
  } catch (err) {
    throw new Error(`🔁 Bank validation failed: ${err.response?.data?.error || err.message}`);
  }
};

// ✅ Final Controller: Process Payment
export const processPayment = async (req, res) => {
  try {
    const { code, amount, email } = req.params;
    const payerInfo = req.body;
    const { currentUrl, returnUrl } = payerInfo;
    const amt = parseFloat(amount);

    // Step 1: Validate merchant
    const { merchant, merchantBankAccount } = await checkMerchant(code, email, currentUrl);

    // Step 2: Get admin account
    const admin = await Admin.findOne();
    if (!admin) throw new Error('❌ Admin record missing');

    // Step 3: Validate bank accounts
    const { payer, merchantBank, adminBank } = await validateBankAccounts(
      payerInfo.accountNumber,
      merchantBankAccount.bankAccountNumber,
      admin.bankAccountNumber
    );

    // Step 4: Get or create customer
    let customer = await CustomerData.findOne({ accountNumber: payerInfo.accountNumber });
    if (!customer) {
      const count = await CustomerData.countDocuments();
      const newCustomerId = `CUST-${(count + 1).toString().padStart(5, '0')}`;
      customer = await CustomerData.create({
        customerId: newCustomerId,
        name: payerInfo.accountHolderName,
        bankName: payerInfo.bankName,
        accountNumber: payerInfo.accountNumber,
        ifsc: payerInfo.ifsc,
        phoneNumber: payerInfo.phoneNumber
      });
    }

    // Step 5: Process transaction
    const txnResult = await processTransaction({
      payer,
      adminBank,
      merchant,
      merchantBankAccount,
      amount: amt,
      code,
      accountHolderName: payerInfo.accountHolderName,
      phoneNumber: payerInfo.phoneNumber,
      bankName: payerInfo.bankName,
      customerId: customer.customerId,
      currentUrl,
      returnUrl
    });

    // Step 6: Handle transaction result
    if (txnResult.status === 'failed') {
      return res.status(400).json({ error: txnResult.reason });
    }

    // ✅ Success → update lastSuccessMap
    if (req.lastSuccessMap && req.userId) {
      req.lastSuccessMap.set(req.userId, Date.now());
    }

    return res.json({
      message: '✅ Payment successful. Awaiting admin approval.',
      transaction: txnResult.transaction,
      merchantName: txnResult.merchantName,
      reference: txnResult.reference
    });

  } catch (err) {
    console.error('❌ Payment processing failed:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

const processTransaction = async ({ payer, adminBank, merchant, merchantBankAccount, amount, code, accountHolderName, phoneNumber, bankName, customerId, currentUrl, returnUrl }) => {
  if (payer.balance < amount) {
    const failedTxn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchantBankAccount.bankAccountNumber,
      adminAccountNumber: adminBank.accountNumber,
      originalAmount: amount,
      commission: 0,
      amountToMerchant: 0,
      payeeToAdminStatus: 'failed',
      payeeToAdminDescription: 'Insufficient balance',
      adminToMerchantStatus: 'failed',
      adminToMerchantDescription: 'Not applicable',
      overallStatus: 'failed',
      customerId,
      customerName: accountHolderName,
      customerPhone: phoneNumber,
      customerBankName: bankName,
      currentUrl,
      returnUrl
    });
    await failedTxn.save();
    return { status: 'failed', reason: '❌ Insufficient balance in your account.' };
  }

  const commission = Math.floor(amount * 0.02);
  const netToMerchant = amount - commission;

  try {
    const encryptedPayload = encrypt({
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: adminBank.accountNumber,
      amount
    });

    const transferRes = await axios.post(`${BANK_API_BASE}/transfer`, encryptedPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const decrypted = decrypt(transferRes.data);

    if (decrypted.status !== 'success') {
      return { status: 'failed', reason: `❌ Transfer failed: ${decrypted.message}` };
    }

    const txn = new Transaction({
      integrationCode: code,
      fromAccountNumber: payer.accountNumber,
      toAccountNumber: merchantBankAccount.bankAccountNumber,
      adminAccountNumber: adminBank.accountNumber,
      originalAmount: amount,
      commission,
      amountToMerchant: netToMerchant,
      payeeToAdminStatus: 'success',
      payeeToAdminDescription: 'Payment received by admin',
      adminToMerchantStatus: 'pending',
      adminToMerchantDescription: 'Awaiting admin approval',
      overallStatus: 'pending',
      customerName: accountHolderName,
      customerId,
      customerPhone: phoneNumber,
      customerBankName: bankName,
      bankTransactionId: decrypted.transactionId || `BANKTXN-${Date.now()}`,
      currentUrl,
      returnUrl
    });

    await txn.save();

    return {
      status: 'success',
      transaction: txn,
      merchantName: merchant.name,
      reference: txn._id.toString().slice(-8).toUpperCase()
    };

  } catch (err) {
    throw new Error(`❌ Bank transfer error: ${err.response?.data?.error || err.message}`);
  }
};
