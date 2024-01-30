import User from './user.model';

export async function findUser(payload: { email: string }) {
  return User.findOne({ email: payload.email });
}

export async function createUser(payload: { email: string, password: string }) {
  return User.create(payload);
}

export async function findUsers(payload: { email: string }) {
  const { email } = payload;
  return User.find({ email: { $regex: new RegExp(email, 'i') } }, { _id: 1, email: 1 }).limit(30);
}

export async function updateUsers(payload: { email: string }) {
  const { email } = payload;
  return User.find({ email: { $regex: new RegExp(email, 'i') } }, { _id: 1, email: 1 }).limit(30);
}
