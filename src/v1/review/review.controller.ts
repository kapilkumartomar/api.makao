import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import { findIsReviewGiven, findReview, postReview } from './review.resources';
import { findOneAndUpdateUser } from '../user/user.resources';

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
    const review: any = await findIsReviewGiven(eventId, userId);
    return res.status(200).json({
      message: 'given Review fetched successfully',
      data: review,
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
    const reviews: any = await postReview(req.body);
    const givenReview = reviews[0].review;
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
      data: reviews,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}
