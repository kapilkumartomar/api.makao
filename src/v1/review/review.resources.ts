import mongoose from 'mongoose';
import Review from './review.model';

export async function findReview(query: { reviewed?: Number, eventId?: string, userReveiwBy?: string }) {
  return Review.find(query);
}

export async function findOneReview(query: { eventId: string, userReviewBy: string, challengeId: string }) {
  return Review.findOne(query);
}

export async function postReview(payload: { [key: string]: string | boolean }) {
  return Review.create(payload);
}

export async function eventReviewAverage({ eventId }: { eventId: string }) {
  return Review.aggregate([
    {
      $match: {
        eventId: new mongoose.Types.ObjectId(eventId),
      },
    },
    {
      $group: {
        _id: null,
        totalReviewedEvents: { $sum: 1 },
        averageEventReview: { $avg: '$review' },
      },
    },
    {
      $project: {
        _id: 0,
        averageEventReview: 1,
      },
    },
  ]);
}
