import { IAnyObject, aggregateBasicQueryGenerator } from '@util/helper';
import mongoose from 'mongoose';
import Notification from './notification.model';

export async function findNotifications(userId: string, basicQuery: any) {
  const aggregateQuery: any = [...aggregateBasicQueryGenerator(basicQuery)];

  return Notification.aggregate([
    { $match: { for: new mongoose.Types.ObjectId(userId) } },
    ...aggregateQuery,
    {
      $lookup: {
        from: 'events',
        localField: 'metaData.eventId',
        foreignField: '_id',
        as: 'event',
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'metaData.userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
              img: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
      },
    },
    {
      $group: {
        _id: '$date',
        notifications: { $push: '$$ROOT' },
      },
    },
  ]);
  // .find(query)
  // .populate('metaData.eventId')
  // .populate('metaData.createdBy')
}

export async function createNotifications(payload: IAnyObject[]) {
  mongoose.set('debug', true);
  return Notification.insertMany(payload);
}
