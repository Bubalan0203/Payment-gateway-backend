const mongoose = require('mongoose');
const BankDetails = require('../models/BankDetails');

// ✅ MongoDB connection
mongoose.connect('mongodb+srv://bubalan2803:BIlqLRWkn3rQIBwT@cluster0.s96ucjm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

const run = async () => {
  try {
    await BankDetails.deleteMany({ bankName: 'INDIAN BANK' }); // clean previous

    const accounts = [];
    for (let i = 0; i < 60; i++) {
      const number = (71762131001 + i).toString();

      accounts.push({
        bankName: "INDIAN BANK",
        accountHolderName: number,
        accountNumber: number,
        ifsc: "IDIB000A067",
        phoneNumber: "8667859174",
        balance: 10000
      });
    }

    await BankDetails.insertMany(accounts);
    console.log("✅ 60 INDIAN BANK accounts seeded.");
  } catch (err) {
    console.error("❌ Error seeding bank accounts:", err);
  } finally {
    mongoose.connection.close();
  }
};

run();

// const mongoose = require('mongoose');
// const BankDetails = require('../models/BankDetails');

// // ✅ MongoDB connection
// mongoose.connect('mongodb+srv://bubalan2803:BIlqLRWkn3rQIBwT@cluster0.s96ucjm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// const run = async () => {
//   try {
//     const result = await BankDetails.updateMany(
//       { bankName: 'INDIAN BANK' },
//       { $set: { balance: 100000 } }
//     );

//     console.log(`✅ Updated ${result.modifiedCount} accounts with balance = 100000`);
//   } catch (err) {
//     console.error("❌ Error updating balances:", err);
//   } finally {
//     mongoose.connection.close();
//   }
// };

// run();