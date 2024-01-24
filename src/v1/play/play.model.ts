import mongoose, { Schema, Types } from 'mongoose';

export interface IPlay {
  amount: Number;
  challenge: Types.ObjectId;
  event: Types.ObjectId;
  playBy: Types.ObjectId;
  createdAt: Date
  updatedAt: Date
}

const playSchema = new Schema<IPlay>({
  amount: {
    type: Number,
    required: true,
  },
  challenge: Schema.Types.ObjectId,
  event: Schema.Types.ObjectId,
  playBy: Schema.Types.ObjectId,
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Play = mongoose.model<IPlay>('Play', playSchema);

export default Play;
