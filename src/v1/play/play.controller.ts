/* eslint-disable max-len */
/* eslint-disable no-console */

import { Request, Response } from 'express';

import { makaoPlatformFeePercentage, wentWrong } from '@util/helper';
import { createPlay, getEventVolume, getChallengeVolume } from './play.resources';
import { updateChallenge } from '../challenge/challenge.resources';
import { updateEvent } from '../event/event.resources';

export async function handleCreateChallenge(req: Request, res: Response) {
  try {
    const { body } = req;
    const challenge = await createPlay({ ...body, playBy: body.userInfo?._id });

    // Play logic

    // getting respective volumes
    const eventVolumePromise = getEventVolume({ eventId: challenge?.event as any });
    const challengeVolumePromise = getChallengeVolume({ challengeId: challenge?.challenge as any });
    const [eventVolumeRes, challengeVolumeRes] = await Promise.all([eventVolumePromise, challengeVolumePromise]);

    const eventVolume = Array.isArray(eventVolumeRes) ? eventVolumeRes[0]?.eventVolume : 0;
    const challengeVolume = Array.isArray(challengeVolumeRes) ? challengeVolumeRes[0]?.challengeVolume : 0;

    // caclulated the fee
    const fees = (eventVolume * makaoPlatformFeePercentage) + (body?.fee ?? 0 * eventVolume);
    console.log('fees', fees);

    // updating the respective
    const updatedChallengePromise = updateChallenge(challenge?.challenge as any, { odd: Number(Number((eventVolume - fees) / challengeVolume).toFixed(2)) });
    const updatedEventPromise = updateEvent(challenge?.event as any, { volume: eventVolume, $inc: { playersCount: 1 } });

    const [updatedChallenge, updatedEvent] = await Promise.all([updatedChallengePromise, updatedEventPromise]);

    console.log('vlaue', eventVolume, challengeVolume, updatedChallenge, updatedEvent);

    return res.status(200).json({
      message: 'Play created successfully',
      data: challenge,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
