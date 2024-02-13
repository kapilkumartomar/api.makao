import mongoose from 'mongoose';
import { IAnyObject } from '@util/helper';
import Play, { IPlay } from './play.model';

export async function createPlay(payload: IPlay) {
  return Play.create(payload);
}

export async function findOneAndUpdatePlay(_id: string, data: any, optionsPayload?: IAnyObject) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };
  return Play.findByIdAndUpdate(_id, data, options);
}

export async function getEventVolume({ eventId }: { eventId: string }) {
  return Play.aggregate([
    {
      $match:
        { event: new mongoose.Types.ObjectId(eventId) },
    },
    {
      $group: {
        _id: null,
        eventVolume: { $sum: '$amount' },
      },
    },

  ]);
}

export async function getEventChallengesVolume({ eventId }: { eventId: string }) {
  return Play.aggregate(
    [
      {
        $match: {
          event: new mongoose.Types.ObjectId(eventId),
        },
      },
      {
        $group: {
          _id: {
            event: '$event',
            challenge: '$challenge',
          },
          challengeVolume: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id from the result
          challenge: '$_id.challenge',
          challengeVolume: 1,
        },
      },
    ],
  );
}

export async function findPlay(query: { playBy?: string, event?: string, challenge?: string }) {
  return Play.findOne(query);
}

export async function findPlays(
  query: { playBy?: string, event?: string, challenge?: string },
  projectionOptions?: IAnyObject,
  options?: IAnyObject,
) {
  const projection: IAnyObject = projectionOptions ?? {};

  return Play.find(query, projection, options ?? {});
}
