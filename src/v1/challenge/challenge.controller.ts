/* eslint-disable no-console */
/* eslint-disable no-unsafe-optional-chaining */

import { Request, Response } from 'express';

import { makaoPlatformFeePercentage, wentWrong } from '@util/helper';
import mongoose from 'mongoose';
import { updateUsersBulkwrite } from '@user/user.resources';
import {
  createChallenge, findChallenges, updateChallenge, updateChallengeBulkwrite, updateChallenges,
} from './challenge.resources';
import { createNotifications } from '../notification/notification.resources';
import { findPlays, getEventChallengesVolume } from '../play/play.resources';
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

    // Sending update notification to the user who proposal the challenge
    if (body?.status || body?.status === false) {
      createNotifications([{
        type: 'PROPOSAL_STATUS',
        for: challenge?.createdBy,
        metaData: {
          eventId: challenge?.event,
          status: challenge?.status,
        },
      }]);
    }

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

export async function handleChallengeRefund(req: Request, res: Response) {
  // Create a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { params: { _id } } = req;

    const challengePromise: any = updateChallenges({ _id }, { playStatus: 'REFUND' });

    // Find plays
    const findPlaysPromise = findPlays({ challenge: _id }, {
      _id: 1, playBy: 1, amount: 1, event: 1, challenge: 1,
    });

    const [challenge, plays] = await Promise.all([
      challengePromise,
      findPlaysPromise,
    ]);

    // need to find Challenges with Status "DEFAULT" to get volume
    const challengesWithStatusDefault = await findChallenges(
      { playStatus: 'DEFAULT', event: challenge?.event },
      { _id: 1 },
    );
    const challengeIds = challengesWithStatusDefault.map((val) => val?._id);

    const totalRefundedAmount: number = plays.reduce((accumulator, play) => accumulator + Number(play?.amount ?? 0), 0);

    const updateEventPromise = updateEvent(challenge?.event as any, { $inc: { volume: -totalRefundedAmount } }, { select: '_id decisionTakenTime volume fees' }) as any;
    const challengesVolumePromise = getEventChallengesVolume({ eventId: challenge?.event as any, challengeIds });

    const [event, challengesVolume] = await Promise.all([
      updateEventPromise,
      challengesVolumePromise,
    ]);

    const eventVolume = event?.volume ?? 0;

    // caclulated the fee
    const organiserFee = eventVolume * (event?.fees ? event?.fees / 100 : 0);
    const fees = (eventVolume * makaoPlatformFeePercentage) + organiserFee;

    // preparing bulk write of updateing odd, it's effected due to we refunded for a challege
    const challengesUpdate = challengesVolume.filter((val) => val?.challengeVolume).map((update) => ({
      updateOne: {
        filter: { _id: update.challenge },
        update: {
          $set: {
            odd: Number(Number((eventVolume - fees) / update.challengeVolume).toFixed(2)),
          },
        },
      },
    }));

    // updating the Users's balance
    const balanceUpdate: any = plays.map((val) => ({
      updateOne: {
        filter: { _id: val?.playBy },
        update: {
          $inc: { balance: Number(val?.amount) },
        },
      },
    }));

    await Promise.all([
      updateUsersBulkwrite(balanceUpdate),
      updateChallengeBulkwrite(challengesUpdate), // updating challeges updated odds etc
    ]);

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    const refundNotifications = plays.map((val) => ({
      type: 'PLAY_STATUS',
      for: val?.playBy,
      metaData: {
        eventId: val?.event,
        status: 'REFUND',
      },
    }));

    createNotifications(refundNotifications);

    return res.status(200).json({
      message: 'Challenge decision taken successfully',
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
