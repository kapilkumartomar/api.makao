/* eslint-disable no-use-before-define */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-expressions */

import mongoose, { Schema } from 'mongoose';
import claimsSchema from './claims.model';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
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
    default: 10000,
  },
  claims: [claimsSchema],
  privacy: {
    type: Boolean,
    default: true, // true = PUBLIC, false = PRIVATE
  },
  description: String,
  img: {
    type: String,
    get: obfuscate,
  },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blacklistedUsers: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
  toJSON: { getters: true, virtuals: false },
});

// Mongoose passes the raw value in MongoDB `email` to the getter
function obfuscate(path: string) {
  if (path) return `${process.env.API_URL}profile/${path}`;
  path;
}

const User = mongoose.model('User', userSchema);

export default User;
