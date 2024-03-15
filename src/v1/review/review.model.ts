/* eslint-disable consistent-return */
/* eslint-disable no-unused-expressions */
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEvent extends Document {
  userReviewBy: Types.ObjectId;
  eventId: Types.ObjectId;
  challengeId: Types.ObjectId;
  review: Number | null;
  feedback?: string;
  link?: string;
  img?: string;
}

const reviewSchema = new Schema<IEvent>({
  userReviewBy: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  challengeId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  review: {
    type: Number,
    enum: [1, 0, null],
    default: null,
  },
  img: {
    type: String,
  },
  feedback: {
    type: String,
  },
  link: {
    type: String,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
