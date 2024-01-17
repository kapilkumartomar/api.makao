import User from './user.model';

export async function findUser(payload: { email: string }) {
  return User.findOne({ email: payload.email });
}

export async function createUser(payload: { email: string, password: string }) {
  return User.create(payload);
}
