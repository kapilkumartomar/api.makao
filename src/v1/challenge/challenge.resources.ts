/* eslint-disable max-len */
import { BulkWriteOperation, IAnyObject } from '@util/helper';
import Challenges, { IChallenge, IPlayStatus } from './challenge.model';

export async function createChallenges(payload: IChallenge[]) {
  return Challenges.insertMany(payload);
}

export async function createChallenge(payload: IChallenge) {
  return Challenges.create(payload);
}

export async function updateChallenge(_id: string, data: { odd?: number, playStatus?: IPlayStatus }, optionsPayload?: IAnyObject) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };
  return Challenges.findByIdAndUpdate(_id, data, options);
}

export async function updateChallengeBulkwrite(challengesUpdate: BulkWriteOperation[]) {
  return Challenges.bulkWrite(challengesUpdate as any);
}

export async function findChallenges(
  query: IAnyObject,
  projectionOptions?: IAnyObject,
) {
  const projection: IAnyObject = projectionOptions ?? {};

  return Challenges.find(query, projection);
}
