import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  img: {
    type: String,
    required: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const User = mongoose.model('User', userSchema);

export default User;
