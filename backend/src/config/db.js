import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saas_naviera';

export const connectDB = async () => {
  try {
    await mongoose.connect(mongodbUri);
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando MongoDB:', error.message);
    process.exit(1);
  }
};
