import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://bubalan2803:BIlqLRWkn3rQIBwT@cluster0.s96ucjm.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');


    //await mongoose.connect('mongodb://localhost:27017/payment');
    //await mongoose.connect('mongodb://admin:admin123@mongodb:27017/payment?authSource=admin');
  

    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
