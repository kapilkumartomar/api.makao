import Review from './review.model';

export async function findReview(query: { reviewed?: Number }) {
  return Review.find(query);
}

export async function findIsReviewGiven(eventId: string, userId: string) {
  return Review.findOne({ $and: [{ eventId }, { userReviewBy: userId }] });
}

export async function postReview(body: any) {
  const { eventId, userInfo: { _id: userId }, userReview } = body;

  return Review.insertMany([
    {
      userReviewBy: userId,
      eventId,
      review: userReview ? 1 : 0,
    },
  ]);
}
