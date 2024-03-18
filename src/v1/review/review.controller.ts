/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */

import { Request, Response } from 'express';
import fs from 'fs/promises';

import { wentWrong } from '@util/helper';
import mongoose, { AnyObject } from 'mongoose';
import User from '@user/user.model';
import { get } from 'lodash';
import { findOneReview, findReview, postReview } from './review.resources';
import { findUserClaims } from '../user/user.resources';
import { findChallenges } from '../challenge/challenge.resources';
import Event from '../event/event.model';

let dirname = __dirname;
console.log('dirname', dirname);
dirname = dirname.split(process.env.NODE_ENV === 'production' ? 'dist' : 'src')[0];
console.log('dirname', dirname);

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
    const { eventId, challengeId } = req.params;
    const { _id: userId } = req.body.userInfo;

    const reviewPromise: any = findOneReview({ eventId, userId, challengeId });
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
    const { files } = req as any;
    const {
      eventId, userInfo: { _id: userReviewBy }, review, feedback, link, challengeId,
    } = req.body;

    // Checking if review already exist for this user, challenge and event
    const existedReview = await findOneReview({ eventId, challengeId, userReviewBy });
    if (existedReview?._id) {
      return res.status(500).json({
        message: 'Review already existed for this challenge',
      });
    }

    // conditionally checking for image
    let imgName = '';
    if (files && Array.isArray(files?.img) && files?.img[0]) {
      const imageFile: any = files?.img[0];

      const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      imgName = `img-${userReviewBy}-${uniquePrefix}-${imageFile?.originalname}`;

      await fs.writeFile(
        `${dirname}public/images/${imgName}`,
        imageFile?.buffer as any,
      );
    }

    const payload: any = {
      challengeId, eventId, userReviewBy, review: review ? 1 : 0,
    };
    if (imgName) payload.img = imgName;
    if (link) payload.link = link;
    if (feedback) payload.feedback = feedback;

    const reviewsPromise: any = postReview(payload);
    const challengesPromise: any = findChallenges({ event: req.body.eventId });

    const [givenReview, challenges] = await Promise.all([reviewsPromise, challengesPromise]);

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

    let unclaimedAmount: any = {};

    if (givenReview) {
      // Checking for the claims
      const challengeIds = challenges?.map((val: AnyObject) => val?._id);
      unclaimedAmount = await findUserClaims(userReviewBy, challengeIds, false);
    }

    return res.status(200).json({
      message: 'Reviews Posted successfully',
      data: { review: givenReview, unclaimedAmount },
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}
