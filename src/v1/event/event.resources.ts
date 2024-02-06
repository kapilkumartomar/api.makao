/* eslint-disable radix */
/* eslint-disable max-len */
import mongoose, { ObjectId, Schema } from 'mongoose';
import {
  IAnyObject, IDBQuery, aggregateBasicQueryGenerator, basicQueryGenerator,
} from '@util/helper';
import Event, { IEvent } from './event.model';

export async function createEvent(payload: IEvent) {
  return Event.create(payload);
}

export async function createEventComments(eventId: Schema.Types.ObjectId, comment: IEvent) {
  return Event.findByIdAndUpdate(
    eventId,
    { $push: { comments: comment } },
    { new: true },
  );
}

export async function getEventComments(eventId: string, query: any) {
  const page = parseInt(query?.page) || 1; // Default to page 1
  const pageSize = parseInt(query?.pageSize) || 20; // Default to 20 comments per page
  return Event.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(eventId) } },
    // "unwind" or deconstruct an array field, creating a separate document for each element in the array
    { $unwind: '$comments' },
    { $sort: { 'comment.createdAt': -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    // getting related users
    {
      $lookup: {
        from: 'users',
        localField: 'comments.createdBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 0,
              email: 1,
            },
          },
        ],
      },
    },
    // selecting specific
    {
      $project: {
        _id: 0,
        comment: '$comments',
        user: { $arrayElemAt: ['$user', 0] },
      },
    },
  ]);
}

export async function updateEvent(
  eventId: Schema.Types.ObjectId,
  update: { videoLink?: string, volume?: number, '$inc'?: IAnyObject, decisionTakenTime?: string },
  optionsPayload?: IAnyObject,
) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };

  return Event.findByIdAndUpdate(
    eventId,
    update,
    options,
  );
}

export async function getEvents(query: IDBQuery, basicQuery: IDBQuery) {
  return Event.find(query ?? {}, null, basicQueryGenerator(basicQuery));
}

export async function getEventsAndPlays(query: IDBQuery, basicQuery: IDBQuery, userId: any) {
  const aggregateQuery: any = [...aggregateBasicQueryGenerator(basicQuery)];
  if (typeof query === 'object' && Object.keys(query).length) aggregateQuery.unshift(query);
  return Event.aggregate([
    ...aggregateQuery,
    {
      $project: {
        _id: 1,
        name: 1,
        img: 1,
        fees: 1,
        volume: 1,
        playersCount: 1,
        createdAt: 1,
      },
    },
    {
      $lookup: {
        from: 'plays', // plays collection name
        localField: '_id',
        foreignField: 'event',
        pipeline: [
          {
            $match: {
              playBy: new mongoose.Types.ObjectId(userId),
            },
          },
          {
            $group: {
              _id: '$challenge',
              totalAmount: { $sum: '$amount' },
              play: { $first: '$_id' },
            },
          },
          {
            $lookup: {
              from: 'challenges',
              localField: '_id',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    logic: 1,
                    title: 1,
                    status: 1,
                    playStatus: 1,
                    odd: 1,
                  },
                },
              ],
              as: 'challenge',
            },
          },
        ],
        as: 'plays', // because when we are grouping by $challenges, and looking up for it, it's strucutre like challenge
      },
    },
    {
      $match: {
        plays: { $exists: true, $ne: [] }, // Filter events with non-empty plays array
      },
    },
  ]);
  // return Play.aggregate([
  //   {
  //     $match: {
  //       playBy: new mongoose.Types.ObjectId(userId),
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: '$challenge',
  //       totalAmount: { $sum: '$amount' },
  //     },
  //   },

  // ])
}

export async function getEvent(_id: string, userId: string) {
  return Event.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(_id) },
    },
    {
      $lookup: {
        from: 'challenges', // challenges collection name
        localField: '_id',
        foreignField: 'event',
        pipeline: [
          {
            $lookup: {
              from: 'plays',
              localField: '_id',
              foreignField: 'challenge',
              pipeline: [
                {
                  $match: {
                    playBy: new mongoose.Types.ObjectId(userId),
                  },
                },
                {
                  $group: {
                    _id: null,
                    myPlay: { $sum: '$amount' },
                  },
                },
              ],
              as: 'plays',
            },
          },

        ],
        as: 'challenges',
      },
    },
    {
      $lookup: {
        from: 'users', // challenges collection name
        localField: 'createdBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
            },
          }],
      },
    },
    {
      $addFields: {
        commentsCount: { $size: '$comments' }, // 'comments' is the array field in the Event schema
      },
    },
    {
      $project: {
        comments: 0,
      },
    },
  ]);
}

export async function findEventById(_id: string) {
  return Event.findById(_id);
}

export async function getFriendsPlayingEvents(friendsIds: ObjectId[], basicQuery: IDBQuery) {
  const aggregateQuery: any = [...aggregateBasicQueryGenerator(basicQuery)];
  return Event.aggregate([
    {
      $project: {
        _id: 1,
        name: 1,
        img: { $concat: [process.env.API_URL, '$img'] },
        fees: 1,
        volume: 1,
        playersCount: 1,
        createdAt: 1,
      },
    },
    {
      $lookup: {
        from: 'plays', // plays collection name
        localField: '_id',
        foreignField: 'event',
        pipeline: [
          {
            $match: {
              playBy: { $in: friendsIds },
            },
          },
        ],
        as: 'plays', // because when we are grouping by $challenges, and looking up for it, it's strucutre like challenge
      },
    },
    {
      $match: {
        plays: { $exists: true, $ne: [] }, // Filter events with non-empty plays array
      },
    },
    {
      $project: {
        plays: 0,
      },
    },
    // pagination
    ...aggregateQuery,
  ]);
}
