/* eslint-disable consistent-return */
/* eslint-disable no-unused-expressions */
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEvent extends Document {
  userReviewBy: Types.ObjectId;
  eventId: Types.ObjectId;
  review: Number | null;

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
  review: {
    type: Boolean,
    enum: [1, 0, null],
    default: null,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
