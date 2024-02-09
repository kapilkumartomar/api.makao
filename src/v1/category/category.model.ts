/* eslint-disable no-use-before-define */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-expressions */
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
    get: obfuscate,
  },
  status: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
  toJSON: { getters: true, virtuals: false },
});

// Mongoose passes the raw value in MongoDB `email` to the getter
function obfuscate(path: string) {
  if (path) return `${process.env.API_URL}category/${path}`;
  path;
}

const Category = mongoose.model('Category', categorySchema);

export default Category;
