// comment.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IClaim {
  amount: Number;
  challenge: mongoose.Types.ObjectId;
  status?: boolean;
  createdAt: Date
  updatedAt: Date
}

export interface ClaimsDocument extends IClaim, Document { }

const claimsSchema = new Schema<ClaimsDocument>({
  amount: { type: String, required: true },
  challenge: { type: Schema.Types.ObjectId, required: true },
  status: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default claimsSchema;
