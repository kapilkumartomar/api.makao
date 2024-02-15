/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable no-unsafe-optional-chaining */

import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { makaoPlatformFeePercentage, wentWrong } from '@util/helper';
import {
  createPlay, getEventVolume, findPlay, findOneAndUpdatePlay, getEventChallengesVolume,
} from './play.resources';
import { findChallenges, updateChallengeBulkwrite } from '../challenge/challenge.resources';
import { updateEvent } from '../event/event.resources';
import { createNotifications } from '../notification/notification.resources';

export async function handleCreatePlay(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { body } = req;

    // checking for organiser
    // const eventInfoPromise = await findEventById(body?.event);

    // checking for player already play for a challenge
    const alreadyPlayedForChallengePromise = findPlay({ playBy: body.userInfo?._id, challenge: body?.challenge });
    // checking for player before creating a play
    const alreadyPlayerPromise = findPlay({ playBy: body.userInfo?._id, event: body?.event });

    const [
      // eventInfo,
      alreadyPlayedForChallenge, alreadyPlayer] = await Promise.all([
      // eventInfoPromise,
      alreadyPlayedForChallengePromise, alreadyPlayerPromise]);

    // Organiser is not allowed to play for event he created

    // if (eventInfo?.createdBy.equals(new ObjectId(body?.userInfo?._id))) {
    //   return res.status(500).json({
    //     message: 'Organiser is not allowed to play for event he created',
    //   });
    // }

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
    const challengesVolumePromise = getEventChallengesVolume({ eventId: play?.event as any });
    const [eventVolumeRes, challengesVolumeRes] = await Promise.all([eventVolumePromise, challengesVolumePromise]);

    const eventVolume = Array.isArray(eventVolumeRes) ? eventVolumeRes[0]?.eventVolume : 0;
    // const challengeVolume = Array.isArray(challengesVolumeRes) ? challengesVolumeRes[0]?.challengeVolume : 0;

    // caclulated the fee
    const organiserFee = eventVolume * (body?.fees ? body?.fees / 100 : 0);
    const fees = (eventVolume * makaoPlatformFeePercentage) + organiserFee;

    // preparing bulk write
    const challengesUpdate = challengesVolumeRes.filter((val) => val?.challengeVolume).map((update) => ({
      updateOne: {
        filter: { _id: update.challenge },
        update: {
          $set: {
            odd: Number(Number((eventVolume - fees) / update.challengeVolume).toFixed(2)),
          },
        },
      },
    }));

    const updateEventPayload: any = { volume: eventVolume };

    // increasing the count only if not a player already
    if (!alreadyPlayer) updateEventPayload.$inc = { playersCount: 1 };

    // updating the respective
    const updatedEventPromise = updateEvent(play?.event as any, updateEventPayload, { select: '_id volume playersCount' });
    const updatedChallengesPromise = await updateChallengeBulkwrite(challengesUpdate);

    const [, updatedEvent] = await Promise.all([updatedChallengesPromise, updatedEventPromise]);

    const updatedChallenges = await findChallenges(
      { _id: { $in: challengesVolumeRes.filter((val) => val?.challengeVolume).map((val) => val?.challenge) } },
      { _id: 1, odd: 1 },
    );

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    // Notification to the organiser on event being played by another user
    createNotifications([{
      type: 'ORGANISED_EVENT',
      for: updatedEvent?.createdBy,
      metaData: {
        eventId: updatedEvent?._id,
        userId: new mongoose.Types.ObjectId(body.userInfo?._id),
        amount: body.amount,
      },
    }]);

    return res.status(200).json({
      message: 'Play created successfully',
      data: { play, updatedChallenges, updatedEvent },
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
