/* eslint-disable radix */
/* eslint-disable max-len */
import mongoose, { ObjectId, Schema } from 'mongoose';
import {
  IAnyObject, IDBQuery, aggregateBasicQueryGenerator,
  basicQueryGenerator,
} from '@util/helper';
import Event, { IEvent, IEventStatus } from './event.model';
import Play from '../play/play.model';

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
    // 'unwind' or deconstruct an array field, creating a separate document for each element in the array
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
              username: 1,
              img: { $concat: [`${process.env.API_URL}profile/`, '$img'] },
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

export async function getFriendsEventComments(eventId: string, query: any, friendsIds: ObjectId[]) {
  const page = parseInt(query?.page) || 1; // Default to page 1
  const pageSize = parseInt(query?.pageSize) || 20; // Default to 20 comments per page
  return Event.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(eventId) } },
    // 'unwind' or deconstruct an array field, creating a separate document for each element in the array
    { $unwind: '$comments' },
    { $sort: { 'comment.createdAt': -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    // getting friends only
    {
      $match: { createdBy: { $in: friendsIds } },
    },
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
              username: 1,
              img: { $concat: [`${process.env.API_URL}profile/`, '$img'] },
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
  update: {
    videoLink?: string, volume?: number, '$inc'?: IAnyObject, decisionTakenTime?: any
    invitations?: string[]
    status?: IEventStatus
  },
  optionsPayload?: IAnyObject,
) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };

  mongoose.set('debug', true);
  return Event.findByIdAndUpdate(
    eventId,
    update,
    options,
  );
}

export async function getEvents(query: IDBQuery, basicQuery?: IDBQuery) {
  mongoose.set('debug', true);
  return Event.find(query ?? {}, null, basicQueryGenerator(basicQuery));
}

export async function getOrganisedEvents(query: IDBQuery, basicQuery: IDBQuery) {
  mongoose.set('debug', true);
  const aggregateQuery: any = [...aggregateBasicQueryGenerator(basicQuery)];
  if (typeof query === 'object' && Object.keys(query).length) aggregateQuery.unshift(query);
  return Event.aggregate([
    ...aggregateQuery,
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'eventId',
        as: 'eventReview',
        pipeline: [
          {
            $group: {
              _id: null,
              totalReview: { $sum: 1 },
              averageReview: { $avg: '$review' },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        averageReview: '$eventReview.averageReview',
      },
    },
    {
      $project: {
        name: 1,
        img: { $concat: [`${process.env.API_URL}images/`, '$img'] },
        fees: 1,
        volume: 1,
        playersCount: 1,
        createdAt: 1,
        decisionTakenTime: 1,
        createdBy: 1,
        startTime: 1,
        endTime: 1,
        averageReview: 1,
      },
    },
  ]);
}

export async function getEventsAndPlays(query: IDBQuery, basicQuery: IDBQuery, userId: any) {
  const aggregateQuery: any = [...aggregateBasicQueryGenerator(basicQuery)];
  if (typeof query === 'object' && Object.keys(query).length) aggregateQuery.unshift(query);
  mongoose.set('debug', true);
  return Event.aggregate([
    ...aggregateQuery,
    {
      $project: {
        _id: 1,
        name: 1,
        img: { $concat: [`${process.env.API_URL}images/`, '$img'] },
        fees: 1,
        volume: 1,
        playersCount: 1,
        createdAt: 1,
        decisionTakenTime: 1,
        createdBy: 1,
        startTime: 1,
        endTime: 1,
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
        as: 'plays', // because when we are grouping by $challenges, and looking up for it, it's structure like challenge
      },
    },
    {
      $match: {
        plays: { $exists: true, $ne: [] }, // Filter events with non-empty plays array
      },
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'eventId',
        as: 'eventReview',
        pipeline: [
          {
            $group: {
              _id: null,
              totalReview: { $sum: 1 },
              averageReview: { $avg: '$review' },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        averageReview: '$eventReview.averageReview',
      },
    },
  ]);
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
          // To calculate user play amount
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

          // to calculate challenge volume
          {
            $lookup: {
              from: 'plays',
              localField: '_id',
              foreignField: 'challenge',
              pipeline: [
                {
                  $group: {
                    _id: null,
                    volume: { $sum: '$amount' },
                  },
                },
              ],
              as: 'challengeVolume',
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
              friends: 1,
              balance: 1,
              instagramLink: 1,
            },
          },
          // Checing if user's friends are playing
          {
            $lookup: {
              from: 'plays',
              localField: 'friends',
              foreignField: 'playBy',
              as: 'friendPlays',
            },
          },
          {
            $addFields: {
              areFriendsPlaying: {
                $cond: {
                  if: { $gt: [{ $size: '$friendPlays' }, 0] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              friends: 0,
              friendPlays: 0,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users', // challenges collection name
        localField: 'invitations',
        foreignField: '_id',
        as: 'invitations',
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'eventId',
        as: 'eventReview',
        pipeline: [
          {
            $match: {
              eventId: new mongoose.Types.ObjectId(_id),
            },
          },
          {
            $group: {
              _id: null,
              totalReview: { $sum: 1 },
              averageReview: { $avg: '$review' },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        commentsCount: { $size: '$comments' }, // 'comments' is the array field in the Event schema
        averageReview: '$eventReview.averageReview',
      },
    },
    {
      $project: {
        comments: 0,
      },
    },
  ]);
}

export async function getEventChallenges(eventId: string, userId: string) {
  return Play.aggregate([
    {
      $facet: {
        // total challenges for calculating Event's Volume
        challengesVolume: [
          { $match: { event: new mongoose.Types.ObjectId(eventId) } },
          {
            $group: {
              _id: '$challenge',
              totalChallengeVolume: {
                $sum: '$amount',
              },
              // playIds includes all play _id which includes in challenge id's group , and these play _ids must have all the players who betted this challenge (will include other players as well).
              playIds: {
                $push: { $toString: '$_id' },
              },
            },
          },
        ],
        userPlayChallenges: [
          {
            $match: {
              event: new mongoose.Types.ObjectId(eventId),
              playBy: new mongoose.Types.ObjectId(userId),
            },
          },
          {
            $lookup: {
              from: 'challenges',
              localField: 'challenge',
              foreignField: '_id',
              as: 'challenges',
              pipeline: [
                {
                  $project: {
                    playStatus: 1,
                    status: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
}

export async function getEventsChallenges(userId: string) {
  return Play.aggregate([
    {
      $facet: {
        // total challenges for calculating Event's Volume
        eventsVolumes: [
          {
            $match: {
              playBy: new mongoose.Types.ObjectId(userId),
            },
          },
          {
            $group: {
              _id: '$event',
              eventData: {
                $push: '$$ROOT',
              },
            },
          },
          {
            $unwind: '$eventData',
          },
          {
            $group: {
              _id: {
                eventId: '$_id',
                challengeId: '$eventData.challenge',
              },
              groupedChallengeData: {
                $push: '$eventData',
              },
            },
          },
          {
            $group: {
              _id: '$_id.eventId',
              challengeData: {
                $push: {
                  _id: '$_id.challengeId',
                  playData: '$groupedChallengeData',
                },
              },
            },
          },
          {
            // applying events collection lookup so that we can get event's fees.
            $lookup: {
              from: 'events',
              localField: '_id',
              foreignField: '_id',
              as: 'event',
              pipeline: [
                {
                  $project: {
                    fees: 1,
                    status: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              challengeData: 1,
              eventFees: '$event.fees',
            },
          },
        ],
        userPlayEventsChallenges: [
          {
            $match: {
              playBy: new mongoose.Types.ObjectId(userId),
            },
          },
          {
            $group: {
              _id: '$event',
              doc: { $push: '$$ROOT' },
              // added count for get to know that how many docs are in one event.
              count: {
                $sum: 1,
              },
            },
          },
          {
            // unwind the array of doc if grouped event has multiple docs
            $unwind: '$doc',
          },
          // {
          //   $replaceRoot: {
          //     newRoot: {
          //       $mergeObjects: [
          //         {
          //           // for keeping count of grouped docs.
          //           count: '$count',
          //         },
          //         '$doc',
          //       ],
          //     },
          //   },
          // },
          {
            $group: {
              _id: {
                eventId: '$_id',
                challengeId: '$doc.challenge',
              },
              groupedChallengeData: {
                $push: '$doc',
              },
            },
          },
          {
            $group: {
              _id: '$_id.eventId',
              userChallengeData: {
                $push: {
                  _id: '$_id.challengeId',
                  playData: '$groupedChallengeData',
                },
              },
            },
          },
          {
            $lookup: {
              from: 'challenges',
              localField: 'userChallengeData._id',
              foreignField: '_id',
              as: 'challenges',
              pipeline: [
                {
                  $project: {
                    playStatus: 1,
                    status: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              userChallengeData: 1,
              challenges: 1,
            },
          },
        ],
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
      $match: {
        privacy: { $in: ['PUBLIC', 'PRIVATE'] },
        endTime: { $gte: new Date() },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        img: { $concat: [`${process.env.API_URL}images/`, '$img'] },
        fees: 1,
        volume: 1,
        playersCount: 1,
        createdAt: 1,
        createdBy: 1,
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

export async function findEventPlayers(eventId: string, basicQuery: any) {
  const aggregateQuery: any = [...aggregateBasicQueryGenerator({ sortAt: 'amount', ...basicQuery })];

  return Play.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    // 'unwind' or deconstruct an array field, creating a separate document for each element in the array
    // getting related users
    ...aggregateQuery,
    {
      $lookup: {
        from: 'users',
        localField: 'playBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 1,
              email: 1,
              username: 1,
              img: { $concat: [`${process.env.API_URL}profile/`, '$img'] },
            },
          },
        ],
      },
    },
    // selecting specific
    // {
    //   $project: {
    //     _id: 0,
    //     comment: '$comments',
    //     user: { $arrayElemAt: ['$user', 0] },
    //   },
    // },
  ]);
}
