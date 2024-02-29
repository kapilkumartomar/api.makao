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
  findOneAndUpdateUser,
  findUserById, findUserClaims, findUserFriends, findUserFriendsDetails, findUsers, updateUser, updateUsersBulkwrite,
} from '@user/user.resources';
import mongoose, { AnyObject, Types } from 'mongoose';
import {
  createEvent, createEventComments, findEventPlayers, getEvent, getEventComments, getEvents, getEventsAndPlays, getFriendsEventComments, getFriendsPlayingEvents, updateEvent,
} from './event.resources';
import { findChallenges, updateChallengeBulkwrite, updateChallenges } from '../challenge/challenge.resources';
import { IEvent } from './event.model';
import { createNotifications } from '../notification/notification.resources';
import { findCategories } from '../category/category.resources';
import {
  deletePlays, findPlays, getChallengesVolume, getEventChallengesVolume,
} from '../play/play.resources';

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

    // const reqChallenges = JSON.parse(body.challenges);
    // delete body.challenges;
    const eventPromise = createEvent({ ...body, img: imgName, createdBy: body.userInfo?._id });
    const userFriendsPromise = findUserFriends(body.userInfo?._id);
    const [event, userFriends] = await Promise.all([eventPromise, userFriendsPromise]);

    // const challenges = await createChallenges(reqChallenges.map((val: IChallenge) => ({ ...val, createdBy: body.userInfo?._id, event: event?._id })));

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
      data: { ...event.toJSON(), challenges: [] },
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

export async function handleGetFriendsComments(req: Request, res: Response) {
  const { query, params, body } = req;
  const eventId = params._id;

  try {
    const userFriends = await findUserFriendsDetails(body?.userInfo?._id);

    const friendIds = userFriends?.friends?.map((val) => val?._id);

    const friendsEventComments = await getFriendsEventComments(eventId as any, query, friendIds as any[]);

    if (!friendsEventComments) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Friends Comment fetched successfully',
      data: friendsEventComments,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

// update an event
export async function handleUpdateEvent(req: Request, res: Response) {
  try {
    const { body, params } = req;
    const eventId = params._id;
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

// update an event
export async function handleUpdateEventFormData(req: Request, res: Response) {
  try {
    const { body, params } = req;
    const { files } = req as any;
    const eventId = params._id;

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

      if (imgName) body.img = imgName;
    }

    const updatedEvent = await updateEvent(eventId as any, body);

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

  const rawQuery: IAnyObject = {};
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
      if (createdBy) {
        rawQuery.createdBy = {
          ...createdBy, $nin: currentUserBlacklist,
        };
      } else rawQuery.createdBy = { $nin: currentUserBlacklist };
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
    rawQuery.decisionTakenTime = { $exists: false };
  }
  if (type === 'HISTORY') {
    rawQuery.$or = [
      { decisionTime: { $lt: currentDateISO } },
      { decisionTakenTime: { $exists: true } },
    ];
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

export async function handleEventDecisionWin(req: Request, res: Response) {
  // Create a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { body, params: { _id } } = req;
    const { winnerChallenges } = body ?? {};

    const challengePromise: any = updateChallenges({ _id: { $in: winnerChallenges } }, { playStatus: 'WIN' });
    // change challenge status to loss
    const challengeLossPromise: any = updateChallenges({ _id: { $nin: winnerChallenges }, event: _id }, { playStatus: 'LOSS' });

    // Find plays
    const findPlaysPromise = findPlays({ challenge: { $in: winnerChallenges } }, {
      _id: 1, playBy: 1, amount: 1, event: 1, challenge: 1,
    });

    const [challenges, plays] = await Promise.all([
      challengePromise,
      findPlaysPromise,
      challengeLossPromise]);

    const event = await updateEvent(_id as any, { decisionTakenTime: new Date(), status: 'COMPLETE' }, { select: '_id decisionTakenTime volume fees status createdBy' }) as any;
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

    const winNotifications = plays.map((val) => ({
      type: 'PLAY_STATUS',
      for: val?.playBy,
      metaData: {
        eventId: val?.event,
        status: 'WIN',
      },
    }));

    createNotifications(winNotifications);

    return res.status(200).json({
      message: 'Event decision taken successfully',
      data: { challenges, event },
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

export async function handleEventDecisionRefund(req: Request, res: Response) {
  // Create a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { params: { _id } } = req;

    const challengePromise: any = updateChallenges({ event: _id }, { playStatus: 'REFUND' });

    // Find plays
    const findPlaysPromise = findPlays({ event: _id }, {
      _id: 1, playBy: 1, amount: 1, event: 1, challenge: 1,
    });

    const [challenge, plays] = await Promise.all([
      challengePromise,
      findPlaysPromise,
    ]);

    const event = await updateEvent(_id as any, { decisionTakenTime: new Date(), volume: 0, status: 'REFUND' }, { select: '_id decisionTakenTime volume fees status' }) as any;

    // updating the Users's balance
    const balanceUpdate: any = plays.map((val) => ({
      updateOne: {
        filter: { _id: val?.playBy },
        update: {
          $inc: { balance: Number(val?.amount) },
        },
      },
    }));

    await updateUsersBulkwrite(balanceUpdate);

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    const refundNotifications = plays.map((val) => ({
      type: 'PLAY_STATUS',
      for: val?.playBy,
      metaData: {
        eventId: val?.event,
        status: 'REFUND',
      },
    }));

    createNotifications(refundNotifications);

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

export async function handleUserRefundAndKick(req: Request, res: Response) {
  // Create a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { body: { type }, params: { _id, userId } } = req;

    // Find plays
    const findPlaysPromise = findPlays({ event: _id, playBy: userId }, {
      _id: 1, playBy: 1, amount: 1, event: 1, challenge: 1,
    });

    // need to find Challenges with Status "DEFAULT" to get volume
    const challengesWithStatusDefaultPromise = findChallenges(
      { playStatus: 'DEFAULT', event: _id },
      { _id: 1 },
    );

    const [plays, challengesWithStatusDefault] = await Promise.all([
      findPlaysPromise,
      challengesWithStatusDefaultPromise,
    ]);

    const challengeIds = challengesWithStatusDefault.map((val) => val?._id);

    const totalRefundedAmount = plays.reduce((accumulator, play) => accumulator + Number(play?.amount ?? 0), 0);

    const eventPromise = updateEvent(_id as any, { $inc: { volume: -totalRefundedAmount, playersCount: -1 } }, { select: '_id volume fees playersCount' }) as any;
    const challengesVolumePromise = getEventChallengesVolume({ eventId: _id as any, challengeIds });

    const [event, challengesVolume] = await Promise.all([eventPromise, challengesVolumePromise]);

    const eventVolume = event?.volume ?? 0;

    // caclulated the fee
    const organiserFee = eventVolume * (event?.fees ? event?.fees / 100 : 0);
    const fees = (eventVolume * makaoPlatformFeePercentage) + organiserFee;

    // preparing bulk write of updateing odd, it's effected due to we refunded for a challege
    const challengesUpdate = challengesVolume.filter((val) => val?.challengeVolume).map((update) => ({
      updateOne: {
        filter: { _id: update.challenge },
        update: {
          $set: {
            odd: Number(Number((eventVolume - fees) / update.challengeVolume).toFixed(2)),
          },
        },
      },
    }));

    // updating the Users's balance
    const balanceUpdate: any = plays.map((val) => ({
      updateOne: {
        filter: { _id: val?.playBy },
        update: {
          $inc: { balance: Number(val?.amount) },
        },
      },
    }));

    // delete user plays, for refund and kickout
    const deletedUserPlaysPromise = deletePlays({ event: _id, playBy: userId });

    await Promise.all([
      updateUsersBulkwrite(type === 'REFUND' ? balanceUpdate : []),
      updateChallengeBulkwrite(challengesUpdate), // updating challenges updated odds etc
      deletedUserPlaysPromise,
    ]);

    // If everything is successful, commit the transaction
    await session.commitTransaction();

    const refundNotifications = plays.map((val) => ({
      type: 'PLAY_STATUS',
      for: val?.playBy,
      metaData: {
        eventId: val?.event,
        status: type === 'REFUND' ? 'REFUND' : 'KICK',
      },
    }));

    createNotifications(refundNotifications);

    return res.status(200).json({
      message: 'User refunded successfully',
      data: { event },
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

export async function handlePlayerClaims(req: Request, res: Response) {
  try {
    const { body: { challengeIds, userInfo } } = req;

    const unclaimedAmount = await findUserClaims(userInfo?._id, challengeIds?.map((_id: string) => new mongoose.Types.ObjectId(_id)), false);

    if (Array.isArray(unclaimedAmount) && unclaimedAmount.length && Array.isArray(unclaimedAmount[0].claims) && unclaimedAmount[0].claims) {
      const claimsIds = unclaimedAmount[0].claims.map((val: AnyObject) => val?._id);
      const updatingBalance = unclaimedAmount[0].claims.filter((claim: AnyObject) => claim?.amount > 0).reduce((accumulator: number, claim: AnyObject) => accumulator + Number(claim?.amount ?? 0), 0);

      console.log('claims Ids', claimsIds);
      const updatedClaims = await updateUser(
        { _id: userInfo?._id },
        {
          $set: { 'claims.$[elem].status': true },
        },
        {
          arrayFilters: claimsIds.map((claimId: any) => ({ 'elem._id': claimId })),
        },
      );
      const updatedUser = await findOneAndUpdateUser(userInfo?._id, { $inc: { balance: updatingBalance > 0 ? updatingBalance : 0 } }, { _id: 1, balance: 1 });
      return res.status(200).json({
        message: 'User refunded successfully',
        data: { updatedClaims, updatedUser },
      });
    }

    return res.status(400).json({
      message: 'No profit lefts to claims ',
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
