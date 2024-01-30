import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const User = mongoose.model('User', userSchema);

export default User;
