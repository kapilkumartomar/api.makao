import {
  BulkWriteOperation, IAnyObject, IDBQuery, aggregateBasicQueryGenerator,
} from '@util/helper';
import mongoose, { AnyObject } from 'mongoose';
import User from './user.model';
import Event from '../event/event.model';

export type ILeaderBoardType = 'FRIEND' | 'PLAYER' | 'ORGANIZER';

export async function findUser(
  payload: { email?: string, privacy?: boolean, _id?: string, claims?: AnyObject, ['web3Auth.verifierId']?: string },
  projection?: AnyObject,
  options?: AnyObject,
) {
  mongoose.set('debug', true);
  return User.findOne(payload, projection ?? {}, options ?? {});
}

export async function findUserById({ _id }: { _id: string }) {
  return User.findById({ _id }).populate('blacklistedUsers');
}

export async function createUser(payload: { email: string, password: string, username?: string }) {
  return User.create(payload);
}

export async function findUsers(payload: IDBQuery, projectionOptions?: IAnyObject) {
  const projection: IAnyObject = projectionOptions ?? {};
  return User.find(payload, projection).limit(30);
}

export async function updateUser(filter: IDBQuery, update: AnyObject, projectionOptions?: IAnyObject) {
  const projection: IAnyObject = projectionOptions ?? {};
  return User.updateOne(filter, update, projection);
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

export async function findLeaderboard({
  leaderBoardType, timeQuery, matchQuery, basicQuery,
}:
  { leaderBoardType: ILeaderBoardType, timeQuery: IDBQuery, matchQuery: IDBQuery, basicQuery: IDBQuery }) {
  const paginationQuery: any = [...aggregateBasicQueryGenerator({ sortAt: 'performance', ...basicQuery })];
  mongoose.set('debug', true);

  let aggregateQuery: any[] = [
  ];

  const friendAggregate = [{
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
  }];

  const projectionAggregate = [{
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
  ];

  if (typeof matchQuery === 'object' && Object.keys(matchQuery).length) aggregateQuery = aggregateQuery.concat(matchQuery);

  // add friends parts
  if (leaderBoardType === 'FRIEND') aggregateQuery = aggregateQuery.concat(friendAggregate);

  // Checking if Time type is given
  if (typeof matchQuery === 'object' && Object.keys(timeQuery).length) aggregateQuery = aggregateQuery.concat(timeQuery);

  // add projection parts
  aggregateQuery = aggregateQuery.concat(projectionAggregate);

  // pagination
  aggregateQuery = aggregateQuery.concat(paginationQuery);

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

export async function addBlacklistUserEvents(body: any) {
  mongoose.set('debug', true);

  const { userInfo: { _id: userId }, blacklistUserId } = body;

  if (userId === blacklistUserId) {
    throw new Error('You cannot blacklist yourself.');
  } else {
    return User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { blacklistedUsers: new mongoose.Types.ObjectId(blacklistUserId) },
      },
      { new: true },
    );
  }
}

export async function removeBlacklistUserEvents(body: any) {
  mongoose.set('debug', true);

  const { userInfo: { _id: userId }, blacklistedUserId } = body;

  return User.findByIdAndUpdate(
    userId,
    {
      $pull: { blacklistedUsers: new mongoose.Types.ObjectId(blacklistedUserId) },
    },
    { new: true },
  );
}

export async function IsBlacklistedInUserEvent(userId: string, eventId: string) {
  mongoose.set('debug', true);
  let isBlacklisted;

  const currentEvent = await Event.findById({ _id: new mongoose.Types.ObjectId(eventId) });
  if (currentEvent && currentEvent!.createdBy) {
    const EventOrganiserUser = await User.findById({
      _id: new mongoose.Types.ObjectId(currentEvent!.createdBy),
    });
    isBlacklisted = EventOrganiserUser?.blacklistedUsers.includes(
      new mongoose.Types.ObjectId(userId),
    );
  } else {
    throw new Error('Not Able to find out if user is blacklisted or not.');
  }

  return isBlacklisted;
}

export async function findUserClaims({
  userId, challengeIds, claimStatus, challengeLookup,
}: { userId: string, challengeIds?: string[], claimStatus?: boolean, challengeLookup?: boolean }) {
  mongoose.set('debug', true);

  const aggregateQuery: any = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    // filtering claims to only true
    {
      $project: {
        _id: 1,
        balance: 1,
        claims: {
          $filter: {
            input: '$claims',
            as: 'claims',
            cond: { $eq: ['$$claims.status', claimStatus ?? true] },
          },
        },
      },
    },
  ];

  if (Array.isArray(challengeIds) && challengeIds[0]) {
    aggregateQuery.push(
      {
        $project: {
          _id: 1,
          balance: 1,
          claims: {
            $filter: {
              input: '$claims',
              as: 'claims',
              cond: { $in: ['$$claims.challenge', challengeIds] },
            },
          },
        },
      },
    );
  }

  const limitAndSort = [{
    $project: {
      balance: 1,
      claims: {
        $sortArray: { input: '$claims', sortBy: { createdAt: -1 } },
      },
    },
  },

  // limiting data
  {
    $project: {
      balance: 1,
      claims: {
        $slice: ['$claims', 50],
      },
    },
  },
  ];

  aggregateQuery.concat(limitAndSort);

  // IF lookup need on challenge
  if (challengeLookup) {
    aggregateQuery.push({
      $project: {
        _id: 0,
        claims: 1,
      },
    });
    aggregateQuery.push({ $unwind: '$claims' });

    aggregateQuery.push({
      $replaceWith: '$claims',
    });
    aggregateQuery.push({
      $lookup: {
        from: 'challenges',
        localField: 'challenge',
        foreignField: '_id',
        as: 'challenge',
        pipeline: [
          {
            $project: {
              _id: 1,
              logic: 1,
              title: 1,
            },
          },
          {
            $lookup: {
              from: 'plays',
              localField: '_id',
              foreignField: 'challenge',
              as: 'userPlay',
              pipeline: [
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                  },
                },
              ],
            },
          },
        ],
      },
    });
  }

  return User.aggregate(aggregateQuery);
}
