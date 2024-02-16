/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-console */
/* eslint-disable no-unsafe-optional-chaining */

import { Request, Response } from 'express';
import fs from 'fs/promises';

import {
  IAnyObject, IDBQuery, makaoPlatformFee, makaoPlatformFeePercentage, wentWrong,
} from '@util/helper';
import {
  findUserById, findUserFriends, findUserFriendsDetails, findUsers, updateUsersBulkwrite,
} from '@user/user.resources';
import mongoose, { AnyObject, Types } from 'mongoose';
import {
  createEvent, createEventComments, findEventPlayers, getEvent, getEventComments, getEvents, getEventsAndPlays, getFriendsPlayingEvents, updateEvent,
} from './event.resources';
import { createChallenges, updateChallenges } from '../challenge/challenge.resources';
import { IChallenge } from '../challenge/challenge.model';
import { IEvent } from './event.model';
import { createNotifications } from '../notification/notification.resources';
import { findCategories } from '../category/category.resources';
import { findPlays, getChallengesVolume } from '../play/play.resources';

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
    rawQuery.createdBy = { $eq: otherUserId || body?.userInfo?._id };
  }

  const userId = body.userInfo._id;

  if (categoryId) rawQuery.category = categoryId;

  // If type is not organised, should be future, public
  if (!type) {
    rawQuery.endTime = { $gte: new Date() };
    rawQuery.privacy = 'PUBLIC';
  }

  try {
    {
      // restricting blacklisted user's events by this below written query.
      const currentUser = await findUserById({ _id: userId });
      const currentUserBlacklist: Types.ObjectId[] = currentUser?.blacklistedUsers?.map((user) => user._id) ?? [];
      const { createdBy } = rawQuery;
      rawQuery.createdBy = { ...(createdBy || {}), $nin: currentUserBlacklist };
    }

    const events = await getEvents(rawQuery, basicQuery as IDBQuery);

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
      // restricting blacklisted user's events by this below written query.
    const currentUser = await findUserById({ _id });
    const currentUserBlacklist: Types.ObjectId[] = currentUser?.blacklistedUsers?.map((user) => user._id) ?? [];

    const eventsPromise = getEvents({ $and: [{ name: { $regex: searchRegex }, createdBy: { $nin: currentUserBlacklist }, privacy: 'PUBLIC' }] });
    const friendsEventsPromise = getEvents({ $and: [{ name: { $regex: searchRegex }, createdBy: { $in: friendIds, $nin: currentUserBlacklist }, privacy: ['PUBLIC', 'PRIVATE'] }] });
    const privateSecretEventsPromise = getEvents({
      $and: [{
        name: { $regex: searchRegex }, createdBy: { $nin: currentUserBlacklist }, invitedUsers: _id, privacy: ['PRIVATE', 'SECRET'],
      }],
    });
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

export async function handleEventDecsion(req: Request, res: Response) {
  // Create a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { body, params: { _id } } = req;
    const { playStatus, winnerChallenges } = body ?? {};

    const challengePromise: any = updateChallenges({ _id: { $in: winnerChallenges } }, { playStatus });
    // change challenge status to loss
    const challengeLossPromise: any = updateChallenges({ _id: { $nin: winnerChallenges } }, { playStatus: 'LOSS' });

    // Find plays
    const findPlaysPromise = findPlays({ challenge: { $in: winnerChallenges } }, {
      _id: 1, playBy: 1, amount: 1, event: 1, challenge: 1,
    });

    const [challenge, plays] = await Promise.all([
      challengePromise,
      findPlaysPromise,
      challengeLossPromise]);

    const event = await updateEvent(_id as any, { decisionTakenTime: new Date() }, { select: '_id decisionTakenTime volume fees' }) as any;
    const challengesVolume = await getChallengesVolume({ challengeIds: winnerChallenges });
    const challengesTotalVolume = Array.isArray(challengesVolume) && challengesVolume[0]?.challengesTotalVolume ? challengesVolume[0]?.challengesTotalVolume : 1;

    // calculated the fee
    const organiserFee = event.volume * (event?.fees ? event?.fees / 100 : 0);
    const fees = (event.volume * makaoPlatformFeePercentage) + organiserFee;

    // updating the Users's balance and claims
    const balanceUpdate: any = plays.map((val) => {
      const profitLoss = (Number((event.volume - fees) / challengesTotalVolume) * Number(val?.amount)) - Number(val?.amount);

      if (profitLoss > 0) {
        return {
          updateOne: {
            filter: { _id: val?.playBy },
            update: {
              $inc: { balance: val?.amount },
              // max Potential win to calculate to win amount
              $push: {
                claims: {
                  amount: profitLoss,
                  challenge: val?.challenge,
                },
              },
            },
          },
        };
      }
      return {
        updateOne: {
          filter: { _id: val?.playBy },
          update: {
            // reducing fee amount from balances
            $inc: { balance: Number(val?.amount) + profitLoss }, // profitloss value is in - negative, that's why doing + plus
          },
        },
      };
    });

    // Organiser balance update by fees
    balanceUpdate.push({
      updateOne: {
        filter: { _id: event?.createdBy },
        update: {
          $inc: { balance: organiserFee ?? 0 },
        },
      },
    });

    // Makao balance udpate by platform fee pending

    await updateUsersBulkwrite(balanceUpdate);

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    const winNofications = plays.map((val) => ({
      type: 'PLAY_STATUS',
      for: val?.playBy,
      metaData: {
        eventId: val?.event,
        status: playStatus,
      },
    }));

    createNotifications(winNofications);

    return res.status(200).json({
      message: 'Event decision taken successfully',
      data: { challenge, event },
    });
  } catch (ex: any) {
    // If there's an error, rollback the transaction
    await session.abortTransaction();
    console.error('Transaction aborted:', ex);

    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  } finally {
    // End the session
    session.endSession();
  }
}
