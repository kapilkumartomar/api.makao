import Review from "./review.model";

export async function findReview(query: { reviewed?: Number }) {
  return Review.find(query);
}

export async function findIsReviewGiven(params: {
  eventId: Number;
  userId: Number;
}) {
  const { eventId, userId } = params;
  return Review.findOne({ $and: [{ eventId }, { userReviewBy: userId }] });
}

export async function postReview(body: any) {
  const { eventId, userId, userReview } = body;
  return Review.insertMany([
    {
      userReviewBy: userId,
      eventId,
      review: userReview,
    },
  ]);
}
