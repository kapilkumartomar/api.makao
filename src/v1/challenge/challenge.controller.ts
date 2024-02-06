/* eslint-disable no-console */
/* eslint-disable no-unsafe-optional-chaining */

import { Request, Response } from 'express';

import { makaoPlatformFeePercentage, wentWrong } from '@util/helper';
import mongoose from 'mongoose';
import { updateUsersBulkwrite } from '@user/user.resources';
import { createChallenge, updateChallenge } from './challenge.resources';
import { findPlays } from '../play/play.resources';
import { updateEvent } from '../event/event.resources';

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

export async function handleUpdateChallenge(req: Request, res: Response) {
  try {
    const { body, params: { _id } } = req;
    const challenge = await updateChallenge(_id, body);

    return res.status(200).json({
      message: 'Challenge Update successfully',
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

    const event = await updateEvent(challenge?.event, { decisionTakenTime: new Date().toISOString() }, { select: '_id decisionTakenTime volume fees' }) as any;

    // caclulated the fee
    const organiserFee = event.volume * (event?.fees ? event?.fees / 100 : 0);
    const fees = (event.volume * makaoPlatformFeePercentage) + organiserFee;
    // updating the Users's balance and claims
    console.log('heloo', fees, organiserFee, findChallenges, event.volume * event?.fees, event?.fees / 100);
    const balanceUpdate: any = findChallenges.map((val) => ({
      updateOne: {
        filter: { _id: val?.playBy },
        update: {
          $inc: { balance: val?.amount },
          // max Potential win to calculate to win amount
          $push: {
            claims: {
              amount:
                ((Number(val?.amount) * challenge?.odd) - Number(val?.amount) - fees),
              challenge: challenge?._id,
            },
          },
        },
      },
    }));

    await updateUsersBulkwrite(balanceUpdate);

    // If everything is successful, commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed successfully');

    return res.status(200).json({
      message: 'Challenge updated successfully',
      data: { challenge, event },
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
