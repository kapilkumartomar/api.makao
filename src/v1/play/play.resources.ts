import mongoose from 'mongoose';
import Play, { IPlay } from './play.model';

export async function createPlay(payload: IPlay) {
  return Play.create(payload);
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

export async function getChallengeVolume({ challengeId }: { challengeId: string }) {
  return Play.aggregate([
    {
      $match:
        { challenge: new mongoose.Types.ObjectId(challengeId) },
    },
    {
      $group: {
        _id: null,
        challengeVolume: { $sum: '$amount' },
      },
    },

  ]);
}

export async function findPlay(query: { playBy?: string, event?: string }) {
  return Play.findOne(query);
}
