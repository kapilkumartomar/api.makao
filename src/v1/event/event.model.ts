import mongoose, { Document, Schema, Types } from 'mongoose';

interface IChallenge {
  title: string;
  logic: string;
}

export interface IEvent extends Document {
  name: string;
  description: string;
  videoLink?: string;
  img?: string;
  privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET';
  startTime: string;
  endTime: string;
  decisionTime: string;
  challenges: IChallenge[];
  proposal?: boolean;
  fees?: number;
  category: Types.ObjectId;
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const eventSchema = new Schema<IEvent>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  videoLink: {
    type: String,
  },
  img: {
    type: String,
  },
  privacy: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE', 'SECRET'],
    default: 'PUBLIC',
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  decisionTime: {
    type: String,
    required: true,
  },
  challenges: [{
    title: String,
    logic: String,
  }],
  proposal: {
    type: Boolean,
    default: true,
  },
  fees: {
    type: Number,
    default: 0,
  },
  category: {
    type: Schema.Types.ObjectId,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
