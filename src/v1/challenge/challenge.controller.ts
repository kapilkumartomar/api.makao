/* eslint-disable no-console */
import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import mongoose from 'mongoose';
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
    mongoose.set('debug', true);
    const { body, params: { _id } } = req;
    const { playStatus } = body ?? {};
    const challenge:any = await updateChallenge(_id, { playStatus });
    const findChallenges = await findPlays({ challenge: _id }, { _id: 1, playBy: 1, amount: 1 });
    const findEvent = await findEventById(challenge?.event);

    // const updateUserBallance = await

    console.log('challel', findChallenges, challenge, findEvent);

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
