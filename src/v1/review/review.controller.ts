/* eslint-disable max-len */
/* eslint-disable no-console */
import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import mongoose, { AnyObject } from 'mongoose';
import User from '@user/user.model';
import { get } from 'lodash';
import { findIsReviewGiven, findReview, postReview } from './review.resources';
import { findUserClaims } from '../user/user.resources';
import { findChallenges } from '../challenge/challenge.resources';
import Event from '../event/event.model';

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
    const { eventId, userInfo: { _id: userId }, userReview } = req.body;
    const reviewsPromise: any = postReview({ eventId, userId, userReview });
    const challengesPromise: any = findChallenges({ event: req.body.eventId });

    const [reviews, challenges] = await Promise.all([reviewsPromise, challengesPromise]);

    {
      // below written code is for increasing organiser's trust-note --> average of all of his events.

      const { createdBy: eventOwnerId } = await Event.findById(req.body.eventId)!;
      const updatedAverageReview = await Event.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.body.eventId),
          },
        },
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'eventId',
            as: 'eventTrustAverage',
            pipeline: [
              {
                $group: {
                  _id: null,
                  totalReviewedEvents: { $sum: 1 },
                  averageEventReview: { $avg: '$review' },
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            eventId: '$_id',
            averageEventReview: '$eventTrustAverage.averageEventReview',
            eventTrustAverage: '$eventTrustAverage',
          },
        },
      ]);

      const previousAverageReview = get(updatedAverageReview, '[0].averageEventReview[0]', '') * 5; // to put rating on 5's scale

      const { userTrustNote: currentUserTrustNote } = await User.findOne(eventOwnerId);

      const finalUserTrustNote = (currentUserTrustNote + previousAverageReview) / 2; // recalculate User's average TrustNote.

      const organiserNewTrustNote = await User.findOneAndUpdate(
        {
          _id: eventOwnerId,
        },
        {
          $set: {
            userTrustNote: finalUserTrustNote,
          },
        },
        {
          returnDocument: 'after',
        },
      );

      console.log(`Organiser's userTrustNote is increased by \x1b[1;31m${previousAverageReview}\x1b[0m in average, new userTrustNote is \x1b[1;31m${organiserNewTrustNote!.userTrustNote}\x1b[0m`);
    }

    const givenReview = reviews[0].review;
    let unclaimedAmount: any = {};

    if (givenReview) {
      // Checking for the claims
      const challengeIds = challenges?.map((val: AnyObject) => val?._id);
      unclaimedAmount = await findUserClaims(userId, challengeIds, false);
    }

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
