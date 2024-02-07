/* eslint-disable no-use-before-define */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-expressions */
import mongoose, { Document, Schema, Types } from 'mongoose';
import commentSchema, { IComment } from './comment.model';

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
  decisionTakenTime: string;
  challenges: IChallenge[];
  proposal?: boolean;
  fees?: number;
  volume?: number;
  playersCount?: number;
  category: Types.ObjectId;
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  comments: [IComment]
  platformFees?: number
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
    get: obfuscate,
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
  decisionTakenTime: {
    type: String,
  },
  // challenges: [{
  //   title: String,
  //   logic: String,
  // }],
  proposal: {
    type: Boolean,
    default: true,
  },
  fees: {
    type: Number,
    default: 0,
  },
  volume: {
    type: Number,
    default: 0,
  },
  playersCount: {
    type: Number,
    default: 0,
  },
  category: {
    type: Schema.Types.ObjectId,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
  },
  comments: [commentSchema], // Embedded comments array
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
  toJSON: { getters: true, virtuals: false },
});

// Mongoose passes the raw value in MongoDB `email` to the getter
function obfuscate(path: string) {
  if (path) return `${process.env.API_URL}images/${path}`;
  path;
}

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
