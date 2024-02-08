/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable no-unsafe-optional-chaining */

import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { makaoPlatformFeePercentage, wentWrong } from '@util/helper';
import {
  createPlay, getEventVolume, getChallengeVolume, findPlay, findOneAndUpdatePlay,
} from './play.resources';
import { updateChallenge } from '../challenge/challenge.resources';
import { findEventById, updateEvent } from '../event/event.resources';
import { createNotifications } from '../notification/notification.resources';

const { ObjectId } = mongoose.Types;

export async function handleCreatePlay(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { body } = req;

    // checking for organiser and
    const eventInfoPromise = await findEventById(body?.event);

    // checking for player already play for a challenge
    const alreadyPlayedForChallengePromise = findPlay({ playBy: body.userInfo?._id, challenge: body?.challenge });
    // checking for player before creating a play
    const alreadyPlayerPromise = findPlay({ playBy: body.userInfo?._id, event: body?.event });

    const [eventInfo, alreadyPlayedForChallenge, alreadyPlayer] = await Promise.all([eventInfoPromise, alreadyPlayedForChallengePromise, alreadyPlayerPromise]);

    // Organiser is not allowed to play for event he created
    if (eventInfo?.createdBy.equals(new ObjectId(body?.userInfo?._id))) {
      return res.status(500).json({
        message: 'Organiser is not allowed to play for event he created',
      });
    }

    // logic regaring if User alreay played for challenge, then add sum otherwise creating new play
    let play: any;
    if (alreadyPlayedForChallenge) {
      play = await findOneAndUpdatePlay(alreadyPlayedForChallenge?._id as any, { amount: alreadyPlayedForChallenge?.amount + body?.amount });
      console.log('alrdf play', play);
    } else {
      play = await createPlay({ ...body, playBy: body.userInfo?._id });
      console.log('new play', play);
    }

    // Play logic

    // getting respective volumes
    const eventVolumePromise = getEventVolume({ eventId: play?.event as any });
    const challengeVolumePromise = getChallengeVolume({ challengeId: play?.challenge as any });
    const [eventVolumeRes, challengeVolumeRes] = await Promise.all([eventVolumePromise, challengeVolumePromise]);

    const eventVolume = Array.isArray(eventVolumeRes) ? eventVolumeRes[0]?.eventVolume : 0;
    const challengeVolume = Array.isArray(challengeVolumeRes) ? challengeVolumeRes[0]?.challengeVolume : 0;

    // caclulated the fee
    const organiserFee = eventVolume * (body?.fees ? body?.fees / 100 : 0);
    const fees = (eventVolume * makaoPlatformFeePercentage) + organiserFee;

    const updateEventPayload: any = { volume: eventVolume };
    // increasing the count only if not a player already
    if (!alreadyPlayer) updateEventPayload.$inc = { playersCount: 1 };

    // updating the respective
    const updatedEventPromise = updateEvent(play?.event as any, updateEventPayload, { select: '_id volume playersCount' });
    const updatedChallengePromise = updateChallenge(
      play?.challenge as any,
      { odd: Number(Number((eventVolume - fees) / challengeVolume).toFixed(2)) },
      { select: '_id odd' },
    );

    const [updatedChallenge, updatedEvent] = await Promise.all([updatedChallengePromise, updatedEventPromise]);

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    // Notification to the organiser on event being played by another user
    createNotifications([{
      type: 'ORGANISED_EVENT',
      for: eventInfo?.createdBy,
      metaData: {
        eventId: eventInfo?._id,
        userId: body.userInfo?._id,
        amount: body.amount,
        challenge: updatedChallenge?.logic,
      },
    }]);

    return res.status(200).json({
      message: 'Play created successfully',
      data: { play, updatedChallenge, updatedEvent },
    });
  } catch (ex: any) {
    await session.abortTransaction();
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  } finally {
    // End the session
    session.endSession();
  }
}
