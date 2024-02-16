/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-console */

import { Request, Response } from 'express';
import fs from 'fs/promises';

import {
  IAnyObject, IDBQuery, makaoPlatformFee, wentWrong,
} from '@util/helper';
import {
  findUserById, findUserFriends, findUserFriendsDetails, findUsers,
} from '@user/user.resources';
import mongoose, { AnyObject, Types } from 'mongoose';
import {
  createEvent, createEventComments, findEventPlayers, getEvent, getEventComments, getEvents, getEventsAndPlays, getFriendsPlayingEvents, updateEvent,
} from './event.resources';
import { createChallenges } from '../challenge/challenge.resources';
import { IChallenge } from '../challenge/challenge.model';
import { IEvent } from './event.model';
import { createNotifications } from '../notification/notification.resources';
import { findCategories } from '../category/category.resources';

let dirname = __dirname;
console.log('dirname', dirname);
dirname = dirname.split(process.env.NODE_ENV === 'production' ? 'dist' : 'src')[0];
console.log('dirname', dirname);

// console.log('dirName split', dirnameSplit, dirname, process.env.NODE_ENV);
// if (!dirnameSplit[1]) dirname = dirname.split('dist')[0];
// else dirname = dirname.split('src')[0];

export async function handleCreateEvent(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { files, body } = req as any;
    let imgName = '';
    // conditionally checking for image
    if (files && Array.isArray(files?.img) && files?.img[0]) {
      const imageFile: any = files?.img[0];

      const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      imgName = `img-${body.userInfo?._id}-${uniquePrefix}-${imageFile?.originalname}`;

      await fs.writeFile(
        `${dirname}public/images/${imgName}`,
        imageFile?.buffer as any,
      );
    }

    console.log('image name');
    const reqChallenges = JSON.parse(body.challenges);
    delete body.challenges;
    const eventPromise = createEvent({ ...body, img: imgName, createdBy: body.userInfo?._id });
    const userFriendsPromise = findUserFriends(body.userInfo?._id);
    const [event, userFriends] = await Promise.all([eventPromise, userFriendsPromise]);

    const challenges = await createChallenges(reqChallenges.map((val: IChallenge) => ({ ...val, createdBy: body.userInfo?._id, event: event?._id })));

    // creating notification to friends
    const notifications = userFriends?.friends.map((val) => ({
      type: 'FRIEND_EVENT',
      for: val,
      metaData: {
        eventId: event?._id,
        userId: new mongoose.Types.ObjectId(body.userInfo?._id),
      },
    }));

    // Notification to the friends about the created event
    createNotifications(notifications as IAnyObject[]);

    await session.commitTransaction();
    return res.status(200).json({
      message: 'Event created successfully',
      data: { ...event.toJSON(), challenges },
    });
  } catch (ex: any) {
    await session.abortTransaction();
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  } finally {
    session.endSession();
  }
}

// Create a comment for an event
export async function handleCreateComment(req: Request, res: Response) {
  const { body, params } = req;
  const eventId = params._id;

  try {
    const updatedEvent = await createEventComments(eventId as any, { ...body, createdBy: body.userInfo?._id });

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Comment created successfully',
      data: req.body,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetComments(req: Request, res: Response) {
  const { query, params } = req;
  const eventId = params._id;

  try {
    const eventComments = await getEventComments(eventId as any, query);

    if (!eventComments) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Comment fetched successfully',
      data: eventComments,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

// updte an event
export async function handleUpdateEvent(req: Request, res: Response) {
  const { body, params } = req;
  const eventId = params._id;

  try {
    const updatedEvent = await updateEvent(eventId as any, body);

    if (updatedEvent?._id && body?.newInvitations && Array.isArray(body?.newInvitations)) {
      const notifications = body.newInvitations.map((val: any) => ({
        type: 'INVITATION',
        for: val,
        metaData: {
          eventId: updatedEvent?._id,
          userId: new mongoose.Types.ObjectId(body?.userInfo?._id),
        },
      }));

      createNotifications(notifications);
    }

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Event updated successfully',
      data: updatedEvent,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetEvents(req: Request, res: Response) {
  const { query, body } = req;
  const {
    type, categoryId, otherUserId, ...basicQuery
  } = query ?? {};

  const rawQuery: IDBQuery = {};
  if (type === 'ORGANISED') {
    // checking between other user and same user
    console.log('organs', otherUserId, otherUserId || body?.userInfo?._id);
    rawQuery.createdBy = otherUserId || body?.userInfo?._id;
  }

  const userId = body.userInfo._id;

  if (categoryId) rawQuery.category = categoryId;

  // If type is not organised, should be future, public
  if (!type) {
    rawQuery.endTime = { $gte: new Date() };
    rawQuery.privacy = 'PUBLIC';
  }

  try {
    // restricting blacklisted user's events by this currentUserBlacklist argument.
    const currentUser = await findUserById({ _id: userId });
    const currentUserBlacklist: Types.ObjectId[] = currentUser?.blacklistedUsers?.map((user) => user._id) ?? [];

    const events = await getEvents(rawQuery, basicQuery as IDBQuery, currentUserBlacklist);
    return res.status(200).json({
      message: 'Events fetched successfully',
      data: events,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetUserEvents(req: Request, res: Response) {
  const { query, body } = req;
  const { type, otherUserId, ...basicQuery } = query ?? {};
  const currentDateISO = new Date();
  const rawQuery: IDBQuery = {};

  if (type === 'CURRENT') {
    rawQuery.startTime = { $lte: currentDateISO };
    rawQuery.decisionTime = { $gte: currentDateISO };
  }
  if (type === 'HISTORY') {
    rawQuery.decisionTime = { $lt: currentDateISO };
  }

  try {
    const events = await getEventsAndPlays({ $match: rawQuery }, basicQuery as IDBQuery, otherUserId || body?.userInfo?._id);

    return res.status(200).json({
      message: 'User Events fetched successfully',
      data: events,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetEvent(req: Request, res: Response) {
  const { params, body } = req;

  try {
    const events = await getEvent(params?._id, body?.userInfo?._id);

    const singleEvent = Array.isArray(events) ? events[0] as IEvent : {} as IEvent;
    const { img } = singleEvent;
    singleEvent.img = `${process.env.API_URL}images/${img}`;
    singleEvent.platformFees = makaoPlatformFee;

    return res.status(200).json({
      message: 'Event fetched successfully',
      data: singleEvent,
    });
  } catch (ex: any) {
    console.error('Error : ', ex);
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetFriendsEvents(req: Request, res: Response) {
  const { body, query } = req;
  const userId = body?.userInfo?._id;

  try {
    const friendsData = await findUserFriends(userId);

    const events = await getFriendsPlayingEvents(friendsData?.friends as any, query as IDBQuery);

    return res.status(200).json({
      message: 'Friends Events fetched successfully',
      data: events,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetPlayers(req: Request, res: Response) {
  const { query, params } = req;
  const eventId = params._id;

  try {
    const players = await findEventPlayers(eventId as any, query);

    return res.status(200).json({
      message: 'Players fetched successfully',
      data: players,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleSearchEventsUsersCategories(req: Request, res: Response) {
  const { query, body } = req;
  const { searchStr } = query;
  const { userInfo: { _id } } = body;
  try {
    const searchRegex = new RegExp(searchStr as string ?? '', 'i');
    const userFriends = await findUserFriendsDetails(_id);
    const friendIds = userFriends?.friends?.map((val) => val?._id?.toString());

    const usersPromise = findUsers({
      $or: [
        { email: { $regex: searchRegex } },
        { username: { $regex: searchRegex } }],
      privacy: true,
    });

    // restricting blacklisted user's events by this currentUserBlacklist argument.
    const currentUser = await findUserById({ _id });
    const currentUserBlacklist: Types.ObjectId[] = currentUser?.blacklistedUsers?.map((user) => user._id) ?? [];

    const eventsPromise = getEvents({ $and: [{ name: { $regex: searchRegex }, privacy: 'PUBLIC' }] }, {}, currentUserBlacklist);
    const friendsEventsPromise = getEvents({ $and: [{ name: { $regex: searchRegex }, createdBy: { $in: friendIds }, privacy: ['PUBLIC', 'PRIVATE'] }] }, {}, currentUserBlacklist);
    const privateSecretEventsPromise = getEvents({ $and: [{ name: { $regex: searchRegex }, invitedUsers: _id, privacy: ['PRIVATE', 'SECRET'] }] }, {}, currentUserBlacklist);
    const categoriesPromise = findCategories({ $and: [{ title: { $regex: searchRegex }, status: true }] });

    const [users, events, friendsEvents, privateSecretEvents, categories] = await Promise.all([
      usersPromise, eventsPromise, friendsEventsPromise, privateSecretEventsPromise, categoriesPromise]);

    return res.status(200).json({
      message: 'Details fetched successfully',
      data: {
        users, userFriends: userFriends?.friends?.filter((val: AnyObject) => searchRegex.test(val?.username)) ?? [], events, friendsEvents, privateSecretEvents, categories,
      },
      // page: query?.page ? Number(query?.page) : 1,
      // pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
