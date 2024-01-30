/* eslint-disable no-console */
import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import mongoose from 'mongoose';
import { updateUsersBulkwrite } from '@user/user.resources';
import { createChallenge, updateChallenge } from './challenge.resources';
import { findPlays } from '../play/play.resources';
import { findEventById } from '../event/event.resources';

export async function handleCreateChallenge(req: Request, res: Response) {
  try {
    const { body } = req;
    const status = body?.createdBy === body?.userInfo?._id;
    const challenge = await createChallenge({ ...body, status, createdBy: body.userInfo?._id });

    return res.status(200).json({
      message: 'Challenge created successfully',
      data: challenge,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleChallengeDecision(req: Request, res: Response) {
  // Create a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { body, params: { _id } } = req;
    const { playStatus } = body ?? {};

    const challengePromise: any = updateChallenge(_id, { playStatus });
    const findChallengesPromise = findPlays({ challenge: _id }, { _id: 1, playBy: 1, amount: 1 });
    const [challenge, findChallenges] = await Promise.all([
      challengePromise,
      findChallengesPromise]);

    await findEventById(challenge?.event);

    // updating the Users's balance and claims
    const balanceUpdate: any = findChallenges.map((val) => ({
      updateOne: {
        filter: { _id: val?.playBy },
        update: {
          $inc: { balance: val?.amount },
          $push: { claims: { amount: val?.amount, challenge: val?._id } },
        },
      },
    }));

    await updateUsersBulkwrite(balanceUpdate);

    // If everything is successful, commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed successfully');

    return res.status(200).json({
      message: 'Challenge updated successfully',
      data: challenge,
    });
  } catch (ex: any) {
    // If there's an error, rollback the transaction
    await session.abortTransaction();
    console.error('Transaction aborted:', ex);

    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  } finally {
    // End the session
    session.endSession();
  }
}
