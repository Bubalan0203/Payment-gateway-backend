const mongoose = require('mongoose');
const BankDetails = require('../models/BankDetails');

mongoose.connect('mongodb+srv://bubalan2803:BIlqLRWkn3rQIBwT@cluster0.s96ucjm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
const dummyAccounts = [
  { name: "Babloo", accountNumber: "SBIN00012345678", ifsc: "SBIN0001234", balance: 8500 },
  { name: "Nithya", accountNumber: "HDFC00123456789", ifsc: "HDFC0009876", balance: 12000 },
  { name: "Deshik", accountNumber: "ICIC00045678901", ifsc: "ICIC0002345", balance: 65000 },
  { name: "Gopika", accountNumber: "PNB00087654321", ifsc: "PUNB0456789", balance: 97000 },
  { name: "Chandru", accountNumber: "AXIS00011223344", ifsc: "AXIS0001122", balance: 4300 },
  { name: "Suhaina", accountNumber: "BOI00033445566", ifsc: "BKID0005566", balance: 12500 },
  { name: "Sandy", accountNumber: "YESB00099887766", ifsc: "YESB0007788", balance: 10000 },
  { name: "Thabita", accountNumber: "KARB00000011122", ifsc: "KARB0001122", balance: 10000 },
  { name: "Sai", accountNumber: "IDBI00066778899", ifsc: "IBKL0006789", balance: 30000 },
  { name: "Suveatha", accountNumber: "UBIN00044556677", ifsc: "UBIN0005566", balance: 72000 }
];

const run = async () => {
  try {
    await BankDetails.deleteMany({});
    await BankDetails.insertMany(dummyAccounts);
    console.log("✅ 10 bank accounts seeded successfully.");
  } catch (err) {
    console.error("❌ Error seeding bank accounts:", err);
  } finally {
    mongoose.connection.close();
  }
};

run();