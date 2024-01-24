import Challenges, { IChallenge } from './challenge.model';

export async function createChallenges(payload: IChallenge[]) {
  return Challenges.insertMany(payload);
}

export async function createChallenge(payload: IChallenge) {
  return Challenges.create(payload);
}

export async function updateChallenge(_id: string, data: { odd: number }) {
  return Challenges.findByIdAndUpdate(_id, data, { new: true });
}
