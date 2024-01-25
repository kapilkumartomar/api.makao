/* eslint-disable radix */
/* eslint-disable max-len */
import mongoose, { Schema } from 'mongoose';
import { IAnyObject } from '@util/helper';
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
  update: { videoLink?: string, volume?: number, '$inc': IAnyObject },
  optionsPayload?: IAnyObject,
) {
  const options: IAnyObject = { new: true, ...optionsPayload } ?? { new: true };

  return Event.findByIdAndUpdate(
    eventId,
    update,
    options,
  );
}

export async function getEvents(query: any) {
  const page = parseInt(query?.page) || 1; // Default to page 1
  const pageSize = parseInt(query?.pageSize) || 20; // Default to 20 events per page
  return Event.find()
    .sort({ volume: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);
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
