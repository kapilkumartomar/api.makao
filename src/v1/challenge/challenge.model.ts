import mongoose, { Schema, Types } from 'mongoose';

export interface IChallenge {
    title: string;
    logic: string;
    status?: boolean,
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
    required: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
  event: Schema.Types.ObjectId,
  createdBy: Schema.Types.ObjectId,
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Challenge = mongoose.model<IChallenge>('Challenge', challengeSchema);

export default Challenge;
