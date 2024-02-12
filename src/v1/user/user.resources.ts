import {
  BulkWriteOperation, IAnyObject, IDBQuery, aggregateBasicQueryGenerator,
} from '@util/helper';
import mongoose from 'mongoose';
import User from './user.model';
import Event from '../event/event.model';

export async function findUser(payload: { email?: string, privacy?: boolean, _id?: string }) {
  return User.findOne(payload);
}

export async function findUserById({ _id }: { _id: string }) {
  return User.findById({ _id });
}

export async function createUser(payload: { email: string, password: string, username?: string }) {
  return User.create(payload);
}

export async function findUsers(payload: IDBQuery, projectionOptions?: IAnyObject) {
  const projection: IAnyObject = projectionOptions ?? {};
  return User.find(payload, projection).limit(30);
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

export async function findFriendsLeaderboard(timeQuery: IDBQuery, basicQuery: IDBQuery) {
  const paginationQuery: any = [...aggregateBasicQueryGenerator({ sortAt: 'performance', ...basicQuery })];
  mongoose.set('debug', true);
  const aggregateQuery: any = [
    {
      $unwind: '$friends',
    },
    {
      $lookup: {
        from: 'users', // Assuming the friends are in the 'users' collection
        localField: 'friends',
        foreignField: '_id',
        as: 'friendDetails',
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [{}, { $arrayElemAt: ['$friendDetails', 0] }], // Take the first element of the friendDetails array
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        img: { $concat: [`${process.env.API_URL}profile/`, '$img'] },
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
    {
      $addFields: {
        performance: {
          $cond: {
            if: { $eq: ['$totalAmountPlayed', 0] }, // Check if totalAmountPlayed is zero
            then: 0, // Set performance to null if totalAmountPlayed is zero
            else: { $divide: ['$totalProfit', '$totalAmountPlayed'] }, // Perform the division if totalAmountPlayed is not zero
          },
        },
      },
    },

    // pagination
    ...paginationQuery,

  ];
  if (typeof timeQuery === 'object' && Object.keys(timeQuery).length) aggregateQuery.unshift(timeQuery);

  return User.aggregate(aggregateQuery);
}

// needs to merge logic with above
export async function findLeaderboard(timeQuery: IDBQuery, basicQuery: IDBQuery) {
  const paginationQuery: any = [...aggregateBasicQueryGenerator({ sortAt: 'performance', ...basicQuery })];
  mongoose.set('debug', true);
  const aggregateQuery: any = [
    {
      $project: {
        _id: 1,
        username: 1,
        img: { $concat: [`${process.env.API_URL}profile/`, '$img'] },
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
        performance: { $divide: ['$totalProfit', '$totalAmountPlayed'] },
      },
    },
    {
      $project: {
        plays: 0,
        claims: 0,
      },
    },
    {
      $addFields: {
        performance: { $divide: ['$totalProfit', '$totalAmountPlayed'] },
      },
    },

    // pagination
    ...paginationQuery,

  ];
  if (typeof timeQuery === 'object' && Object.keys(timeQuery).length) aggregateQuery.unshift(timeQuery);

  return User.aggregate(aggregateQuery);
}

export async function findOrganisersLeaderboard(timeQuery: IDBQuery, basicQuery: IDBQuery) {
  const paginationQuery: any = [...aggregateBasicQueryGenerator({ sortAt: 'totalVolume', ...basicQuery })];
  const aggregateQuery: any = [
    {
      $group: {
        _id: '$createdBy',
        totalVolume: { $sum: '$volume' },
        decisionTime: { $first: '$decisionTime' },
      },
    },
    // pagination query
    ...paginationQuery,
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              img: 1,
            },
          },
        ],
        as: 'userDetails',
      },
    },
    {
      $unwind: '$userDetails',
    },
    {
      $project: {
        _id: '$userDetails._id',
        username: '$userDetails.username',
        img: { $concat: [`${process.env.API_URL}profile/`, '$userDetails.img'] },
        totalVolume: 1,
        decisionTime: 1,
      },
    },
  ];

  if (typeof timeQuery === 'object' && Object.keys(timeQuery).length) aggregateQuery.unshift(timeQuery);

  mongoose.set('debug', true);
  return Event.aggregate(aggregateQuery);
}
