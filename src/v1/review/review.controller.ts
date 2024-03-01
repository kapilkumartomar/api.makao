/* eslint-disable no-unreachable-loop */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
import { Request, Response } from 'express';

import { uniq } from 'lodash';
import { wentWrong } from '@util/helper';
import { AnyObject } from 'mongoose';
import { findIsReviewGiven, findReview, postReview } from './review.resources';
import { findOneAndUpdateUser, findUserClaims } from '../user/user.resources';
import { findChallenges } from '../challenge/challenge.resources';
import { getEvents } from '../event/event.resources';
import { findPlays } from '../play/play.resources';

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

export async function handleValidatePlayerReview(req: Request, res: Response) {
  try {
    const reducePlayerTrustNote = async (playerId: string) => {
      // reduce user-trust-score logic -->
      //   user.userTrustNote = Math.max( minTrustNote, currentTrustNote - currentTrustNote * baseChangePercentage );
      const minTrustNote = 0; // Minimum trust note
      const baseChangePercentage = 0.05;
      const previousPlayerData = await findOneAndUpdateUser(playerId, [
        {
          $set:
          {
            userTrustNote:
            {
              // .
              $max: [minTrustNote, { $subtract: ['$userTrustNote', { $multiply: ['$userTrustNote', baseChangePercentage] }] }],
            },
          },
        },
      ], { new: false });

      const newUserTrustNote = Math.max(minTrustNote, previousPlayerData!.userTrustNote - (previousPlayerData!.userTrustNote * baseChangePercentage));
      console.log(`player::\x1b[1;31m${playerId}\x1b[0m 's userTrustNote is decreased by \x1b[1;31m${(previousPlayerData!.userTrustNote * baseChangePercentage)}\x1b[0m in average, new userTrustNote is \x1b[1;31m${newUserTrustNote}\x1b[0m`);
    };

    const allEvents = await getEvents({});
    console.log('total Events --> ', allEvents.length);
    for (const event of allEvents) {
      const eventId = event._id.toString(); // current single event ID.

      {
        // here validating players reveiw who haven't given their review in a particular Event.

        // 1. find all player's ids.
        const allPlays = await findPlays({ event: eventId });
        const allPlayersId = allPlays.map((play) => play.playBy.toString());
        const uniquPlayersId = uniq(allPlayersId);

        console.log('uniqueplayers id ', uniquPlayersId, uniquPlayersId.length, allPlayersId.length);

        // 2. find all player's ids who has reviewed this event.
        const reviewedPlayers = await findReview({ eventId });
        console.log(`review entry docs, ${reviewedPlayers} , total reviews on event::${eventId} is ${reviewedPlayers.length}.`);
        const reviewedPlayerIds = reviewedPlayers.map((reviewedPlayer) => reviewedPlayer.userReviewBy.toString());

        // 3. filter who haven't given review.
        const notReviewedPlayers: string[] = uniquPlayersId.filter((playerId) => !reviewedPlayerIds.includes(playerId));
        console.log('not reviewed players', notReviewedPlayers, notReviewedPlayers.length);

        // 3. validate review for those who haven't given review in the event.
        if (notReviewedPlayers.length > 0) {
          for (const notReviewedPlayer of notReviewedPlayers) {
            const userReview = true;
            await postReview({ eventId, userId: notReviewedPlayer, userReview });
            console.log(`Validated Review of the player \x1b[1;31m${notReviewedPlayer}\x1b[0m for Event \x1b[1;31m${eventId}\x1b[0m`);
          }
        }
      }
    }

    {
      // decreasing trust-note rating for players who have given wrongly reviews.(wrongly reviews are the ones that are in minority)
      const allReviews = await findReview({});
      const positiveReviews = allReviews.filter((review) => review.review);
      const negativeReviews = allReviews.filter((review) => !review.review);

      if (positiveReviews.length && negativeReviews.length) { // both positive & negative reviews must be present.
        if (positiveReviews.length > negativeReviews.length) {
          const minorityNegativePlayersId = negativeReviews.map((review) => review.userReviewBy.toString());
          for (const playerId of minorityNegativePlayersId) {
            // here reducing player's trust-note rating who have given wrongly review.
            await reducePlayerTrustNote(playerId);
          }
        } else if (positiveReviews.length < negativeReviews.length) {
          const minorityPositivePlayersId = positiveReviews.map((review) => review.userReviewBy.toString());
          for (const playerId of minorityPositivePlayersId) {
            // here reducing player's trust-note rating who have given wrongly review.
            await reducePlayerTrustNote(playerId);
          }
        }
      }
    }

    return res.status(200).json({
      message: 'given Review fetched successfully',
      data: {},
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
              // removing this increase in player trust-note logic as nothing to do when player gives a true decision of an event.
              // else: { $min: [maxTrustNote, { $add: ['$userTrustNote', { $multiply: ['$userTrustNote', baseChangePercentage] }] }] },
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
