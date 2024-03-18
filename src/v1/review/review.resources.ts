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
