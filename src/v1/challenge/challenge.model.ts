import mongoose, { Schema, Types } from 'mongoose';

export type IPlayStatus = 'WIN' | 'LOSS' | 'CANCEL' | 'REFUND' | 'DEFAULT'
export interface IChallenge {
  title: string;
  logic: string;
  status?: boolean,
  playStatus?: IPlayStatus
  odd?: Number
  event: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date
  updatedAt: Date
}

const challengeSchema = new Schema<IChallenge>({
  title: {
    type: String,
    required: true,
  },
  logic: {
    type: String,
    default: '',
  },
  status: {
    type: Boolean,
    default: true,
  },
  playStatus: {
    type: String,
    enum: ['WIN', 'LOSS', 'CANCEL', 'REFUND', 'DEFAULT'],
    default: 'DEFAULT',
  },
  odd: {
    type: Number,
    default: 0.9,
  },
  event: Schema.Types.ObjectId,
  createdBy: Schema.Types.ObjectId,
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Challenge = mongoose.model<IChallenge>('Challenge', challengeSchema);

export default Challenge;
