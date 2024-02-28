import mongoose, { AnyObject } from 'mongoose';
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

export async function getEventChallengesVolume({ eventId, challengeIds }: { eventId: string, challengeIds: mongoose.Types.ObjectId[] }) {
  return Play.aggregate(
    [
      {
        $match: {
          event: new mongoose.Types.ObjectId(eventId),
          challenge: { $in: challengeIds },
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

export async function getChallengesVolume({ challengeIds }: { challengeIds: string[] }) {
  return Play.aggregate(
    [
      {
        $match: {
          challenge: { $in: challengeIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $group: {
          _id: null,
          challengesTotalVolume: { $sum: '$amount' },
        },
      },
      // {
      //   $project: {
      //     _id: 1, // Exclude _id from the result
      //     challengeVolume: 1,
      //   },
      // },
    ],
  );
}

export async function findPlay(query: { playBy?: string, event?: string, challenge?: string }) {
  return Play.findOne(query);
}

export async function findPlays(
  query: { playBy?: string, event?: string, challenge?: string | AnyObject },
  projectionOptions?: IAnyObject,
  options?: IAnyObject,
) {
  const projection: IAnyObject = projectionOptions ?? {};

  return Play.find(query, projection, options ?? {});
}

export async function findPlaysWithDetails(
  query: { playBy?: string, event?: string, challenge?: string },
  projectionOptions?: IAnyObject,
  options?: IAnyObject,
) {
  const projection: IAnyObject = projectionOptions ?? {};

  return Play.find(query, projection, options ?? {})
    .populate({
      path: 'event',
      select: 'name img', // Specify the fields you want to fetch
      options: { strictPopulate: false },
    })
    .populate({
      path: 'challenge',
      select: 'logic title', // Specify the fields you want to fetch
    });
}

export async function deletePlays(
  filter: { playBy?: string, event?: string, challenge?: string | AnyObject },
  projectionOptions?: IAnyObject,
) {
  const projection: IAnyObject = projectionOptions ?? {};

  return Play.deleteMany(filter, projection);
}
