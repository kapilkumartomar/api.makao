import Review from './review.model';

export async function findReview(query: { reviewed?: Number, eventId?: string, userReveiwBy?: string }) {
  return Review.find(query);
}

export async function findIsReviewGiven(eventId: string, userId: string) {
  return Review.findOne({ $and: [{ eventId }, { userReviewBy: userId }] });
}

export async function postReview({ eventId, userId, userReview } : { [key: string]: string | boolean }) {
  return Review.insertMany([
    {
      userReviewBy: userId,
      eventId,
      review: userReview ? 1 : 0,
    },
  ]);
}
