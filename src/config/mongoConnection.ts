/* eslint-disable no-console */
import mongoose from 'mongoose';

export async function MongoConnection() {
  const config: any = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.CONNECTION_STRING as string, config);
    }
    console.log('db connected');
  } catch (error) {
    mongoose.connection.close();
    console.error('Unable to connect to the database:', error);
  }
}

export default MongoConnection;
