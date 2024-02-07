import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import { findIsReviewGiven, findReview, postReview } from './review.resources';

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
    const { _id: userId} = req.body.userInfo;
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
    const reviews: any = await postReview(req.body);

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
