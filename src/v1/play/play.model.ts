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
  challenge: { type: Schema.Types.ObjectId, ref: 'Challenge' },
  event: { type: Schema.Types.ObjectId, ref: 'Event' },
  playBy: Schema.Types.ObjectId,
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Play = mongoose.model<IPlay>('Play', playSchema);

export default Play;
