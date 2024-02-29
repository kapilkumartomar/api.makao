/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import mongoose from 'mongoose';
import parentPort from 'worker_threads';
import MongoConnection from '../config/mongoConnection';
import { getEvents, updateEvent } from '../v1/event/event.resources';
import { updateChallenges } from '../v1/challenge/challenge.resources';
import { findPlays } from '../v1/play/play.resources';
import { updateUsersBulkwrite } from '../v1/user/user.resources';

(async () => {
  try {
    console.log('mongoose connection', mongoose.connection.readyState, parentPort);
    if (mongoose.connection.readyState === 0) await MongoConnection();

    const session = await mongoose.startSession();
    session.startTransaction();
    console.log('cron job executed!');

    const indecisionEvents = await getEvents({
      decisionTime: { $lt: new Date() },
      decisionTakenTime: { $exists: false },
    });

    for (const updatingEvent of indecisionEvents) {
      const challengePromise: any = updateChallenges({ event: updatingEvent?._id }, { playStatus: 'REFUND' });

      // Find plays
      const findPlaysPromise = findPlays({ event: updatingEvent?._id }, {
        _id: 1, playBy: 1, amount: 1, event: 1, challenge: 1,
      });

      const [challenge, plays] = await Promise.all([
        challengePromise,
        findPlaysPromise,
      ]);

      const event = await updateEvent(updatingEvent?._id as any, { decisionTakenTime: new Date(), volume: 0, status: 'REFUND' }, { select: '_id decisionTakenTime volume fees status' }) as any;

      // updating the Users's balance
      const balanceUpdate: any = plays.map((val) => ({
        updateOne: {
          filter: { _id: val?.playBy },
          update: {
            $inc: { balance: Number(val?.amount) },
          },
        },
      }));

      await updateUsersBulkwrite(balanceUpdate);
    }

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    console.log('Indecision ev', indecisionEvents);
  } catch (ex: any) {
    console.log('Error in cron', ex?.message);
  }
  // throw Error("error in code");
  // signal to parent that the job is done
  if (parentPort && parentPort?.postMessage) parentPort?.postMessage('done');
  else process.exit(0);
})();
