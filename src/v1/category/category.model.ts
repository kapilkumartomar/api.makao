import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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

const Category = mongoose.model('Category', categorySchema);

export default Category;
