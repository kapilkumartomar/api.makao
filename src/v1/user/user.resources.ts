import { BulkWriteOperation, IAnyObject } from '@util/helper';
import mongoose from 'mongoose';
import User from './user.model';

export async function findUser({ email }: { email: string }) {
  return User.findOne({ email });
}

export async function findUserById({ _id }: { _id: string }) {
  return User.findById({ _id });
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

export async function updateUsersBulkwrite(update: BulkWriteOperation[]) {
  return User.bulkWrite(update as any[]);
}

export async function findOneAndUpdateUser(_id: string, data: any, optionsPayload?: IAnyObject) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };
  return User.findByIdAndUpdate(_id, data, options);
}

export async function findUserFriendsDetails(_id: string) {
  return User.findById(_id, '_id friends')
    .populate({
      path: 'friends',
      select: 'username email img', // Specify the fields you want to fetch
    });
}

export async function findUserFriends(_id: string) {
  mongoose.set('debug', true);
  return User.findById(_id, '_id friends');
}

export async function findLeaderboard() {
  mongoose.set('debug', true);
  return User.aggregate([
    {
      $unwind: '$friends',
    },
    {
      $project: {
        _id: 1,
        username: 1,
        img: 1,
        claims: 1,
      },
    },
    {
      $lookup: {
        from: 'plays',
        localField: 'claims.challenge',
        foreignField: 'challenge',
        as: 'plays',
      },
    },
    {
      $addFields: {
        totalProfit: { $sum: '$claims.amount' },
        totalAmountPlayed: { $sum: '$plays.amount' },
      },
    },
    {
      $project: {
        plays: 0,
        claims: 0,
      },
    },
    // {
    //   $match: {
    //     createdBy: { $in: friendsIds }
    //   }
    // },
    // {
    //   $group: {
    //     _id: '$createdBy',
    //     totalVolume: { $sum: '$volume' },
    //   },
    // },
    // {
    //   $sort: { totalVolume: -1 },
    // },

    // {
    //   $unwind: '$userDetails',
    // },
    // {
    //   $project: {
    //     _id: '$userDetails._id',
    //     username: '$userDetails.username',
    //     img: '$userDetails.img',
    //     totalVolume: 1,
    //   },
    // },
  ]);
}
