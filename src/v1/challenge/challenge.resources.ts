/* eslint-disable max-len */
import { IAnyObject } from '@util/helper';
import Challenges, { IChallenge } from './challenge.model';

export async function createChallenges(payload: IChallenge[]) {
  return Challenges.insertMany(payload);
}

export async function createChallenge(payload: IChallenge) {
  return Challenges.create(payload);
}

export async function updateChallenge(_id: string, data: { odd: number }, optionsPayload?: IAnyObject) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };
  return Challenges.findByIdAndUpdate(_id, data, options);
}
