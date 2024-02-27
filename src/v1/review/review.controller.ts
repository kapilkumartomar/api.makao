import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import { AnyObject } from 'mongoose';
import { findIsReviewGiven, findReview, postReview } from './review.resources';
import { findOneAndUpdateUser, findUserClaims } from '../user/user.resources';
import { findChallenges } from '../challenge/challenge.resources';

export async function handleGetReview(req: Request, res: Response) {
  try {
    const reviews: any = await findReview(req.query);

    return res.status(200).json({
      message: 'Reviews fetched successfully',
      data: reviews,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}

export async function handleIsReviewGiven(req: Request, res: Response) {
  try {
    const { eventId } = req.params;
    const { _id: userId } = req.body.userInfo;

    const reviewPromise: any = findIsReviewGiven(eventId, userId);
    const challengesPromise: any = findChallenges({ event: eventId });

    let unclaimedAmount: any = {};
    const [review, challenges]: any = await Promise.all([reviewPromise, challengesPromise]);
    if (review) {
      const challengeIds = challenges?.map((val: AnyObject) => val?._id);
      unclaimedAmount = await findUserClaims(userId, challengeIds, false);
    }

    return res.status(200).json({
      message: 'given Review fetched successfully',
      data: { review, unclaimedAmount },
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}

export async function handlePostReview(req: Request, res: Response) {
  try {
    const { _id: userId } = req.body.userInfo;
    const reviewsPromise: any = postReview(req.body);
    const challengesPromise: any = findChallenges({ event: req.body.eventId });

    const [reviews, challenges] = await Promise.all([reviewsPromise, challengesPromise]);

    const givenReview = reviews[0].review;
    let unclaimedAmount: any = {};

    if (givenReview) {
      // Checking for the claims
      const challengeIds = challenges?.map((val: AnyObject) => val?._id);
      unclaimedAmount = await findUserClaims(userId, challengeIds, false);
    }

    // user-trust-score logic
    // if (givenReview === 0) {
    //   user.userTrustNote = Math.max(
    //     minTrustNote,
    //     currentTrustNote - currentTrustNote * baseChangePercentage
    //   );
    // } else if (givenReview === 1) {
    //   user.userTrustNote = Math.min(
    //     maxTrustNote,
    //     currentTrustNote + currentTrustNote * baseChangePercentage
    //   );
    // }
    const maxTrustNote = 5; // Maximum trust note
    const minTrustNote = 0; // Minimum trust note
    const baseChangePercentage = 0.05;
    await findOneAndUpdateUser(userId, [
      {
        $set:
        {
          userTrustNote:
          {
            $cond: {
              if: { $eq: [givenReview, 0] },
              then: { $max: [minTrustNote, { $subtract: ['$userTrustNote', { $multiply: ['$userTrustNote', baseChangePercentage] }] }] },
              else: { $min: [maxTrustNote, { $add: ['$userTrustNote', { $multiply: ['$userTrustNote', baseChangePercentage] }] }] },
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      message: 'Reviews Posted successfully',
      data: { reviews, unclaimedAmount },
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}
