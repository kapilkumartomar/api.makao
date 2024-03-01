/* eslint-disable no-console */
/* eslint-disable no-unreachable-loop */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import mongoose from 'mongoose';
import { uniq } from 'lodash';
import parentPort from 'worker_threads';
import { findOneAndUpdateUser } from '../v1/user/user.resources';
import { findReview, postReview } from '../v1/review/review.resources';
import { getEvents } from '../v1/event/event.resources';
import { findPlays } from '../v1/play/play.resources';
import MongoConnection from '../config/mongoConnection';

(async () => {
  try {
    if (mongoose.connection.readyState === 0) await MongoConnection();
    // Call or create functions here

    // function for reducing player's trust-note.
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

    // here validating players review who haven't given their review in a particular Event.
    const allEvents = await getEvents({});
    console.log('total Events --> ', allEvents.length);
    // eslint-disable-next-line no-lone-blocks
    {
      for (const event of allEvents) {
        const eventId = event._id.toString(); // current single event ID.

        // 1. find all player's ids.
        const allPlays = await findPlays({ event: eventId });
        const allPlayersId = allPlays.map((play) => play.playBy.toString());
        const uniquPlayersId = uniq(allPlayersId);

        console.log('uniqueplayers id ', uniquPlayersId, uniquPlayersId.length, allPlayersId.length);

        // 2. find all player's ids who has reviewed this event.
        const reviewedPlayers = await findReview({ eventId });
        console.log(`review entry docs, ${reviewedPlayers} , total reviews on event::${eventId} is ${reviewedPlayers.length}.`);
        const reviewedPlayerIds: string[] = reviewedPlayers.map((reviewedPlayer) => reviewedPlayer.userReviewBy.toString());

        // 3. filter who haven't given review.
        const notReviewedPlayers: string[] = uniquPlayersId.filter((playerId) => !reviewedPlayerIds.includes(playerId as string)) as string[];
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
  } catch (ex: any) {
    console.log('Error in cron', ex?.message);
  }
  // throw Error("error in code");
  // signal to parent that the job is done
  if (parentPort && parentPort?.postMessage) parentPort?.postMessage('done');
  else process.exit(0);
})();
