import Challenges, { IChallenge } from './challenge.model';

export async function createChallenges(payload: IChallenge[]) {
  return Challenges.insertMany(payload);
}

export async function createChallenge(payload: IChallenge) {
  return Challenges.create(payload);
}
