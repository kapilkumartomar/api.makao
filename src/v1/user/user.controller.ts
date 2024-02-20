/* eslint-disable prefer-destructuring */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  IDBQuery, generateUniqueString, getStartDate, wentWrong,
} from '@util/helper';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import {
  createUser, findOrganisersLeaderboard, findOneAndUpdateUser,
  findUser, findUserById, findUserFriendsDetails, findUsers, findLeaderboard, findUserClaims,
  addBlacklistUserEvents, removeBlacklistUserEvents, IsBlacklistedInUserEvent, ILeaderBoardType,
} from './user.resources';
import { findPlaysWithDetails } from '../play/play.resources';

const BCRYPT_SALT = 10;

let dirname = __dirname;
dirname = dirname.split(process.env.NODE_ENV === 'production' ? 'dist' : 'src')[0];

export async function handleUserSignIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const query: any = await findUser({ email }, { _id: 1, password: 1 });
    if (!query?._id) {
      return res.status(400).json({
        message: "Email does't exist",
      });
    }

    const comparePasswrod = bcrypt.compareSync(
      password,
      query.password,
    );

    if (!comparePasswrod) {
      return res.status(400).json({
        message: "Email/Password does't match",
      });
    }

    const token = jwt.sign({ _id: query._id }, process.env.JWT_STRING as string, {
      expiresIn: '30d',
    });

    return res.status(200).json({
      message: 'Sign in successfully',
      data: { _id: query._id, token },
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleUserSignUp(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const query: any = await findUser({ email });
    if (query?._id) {
      return res.status(400).json({
        message: 'Email already exist. Please use another email.',
      });
    }

    const hash = bcrypt.hashSync(password, BCRYPT_SALT);

    const user = await createUser({ email, password: hash, username: generateUniqueString(6) });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_STRING as string, {
      expiresIn: '30d',
    });

    return res.status(200).json({
      message: 'Sign up successfull',
      data: { _id: user._id, token },
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleUsersSearch(req: Request, res: Response) {
  try {
    const { email } = req.query;
    const query: any = await findUsers({ email: { $regex: new RegExp(email as string, 'i') }, privacy: true }, {
      id: 1, username: 1, email: 1, img: 1,
    });

    return res.status(200).json({
      message: 'Public Users found successfully',
      data: query,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleUserUpdate(req: Request, res: Response) {
  try {
    const { body } = req;
    const query: any = await findOneAndUpdateUser(body?.userInfo?._id, body);

    return res.status(200).json({
      message: 'User updated successfully',
      data: query,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetUser(req: Request, res: Response) {
  try {
    const { body } = req;
    const query: any = await findUserById({ _id: body?.userInfo?._id });

    return res.status(200).json({
      message: 'User details fetched successfully',
      data: query,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetOtherUser(req: Request, res: Response) {
  try {
    const { params, body } = req;
    const { _id } = params ?? {};

    const query: any = { _id };
    if (body?.userInfo?._id !== _id) query.privacy = true;
    let user: any = await findUser(query);

    if (body?.userInfo?._id === _id) {
      user = JSON.parse(JSON.stringify(user));
      user.sameUser = true;
    }
    return res.status(200).json({
      message: 'User details fetched successfully',
      data: user || { privacy: false },
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleUpdateUserProfile(req: Request, res: Response) {
  try {
    const { files, body } = req as any;
    const imageFile: any = files?.img[0];

    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const imgName = `img-${body.userInfo?._id}-${uniquePrefix}-${imageFile?.originalname}`;

    await fs.writeFile(
      `${dirname}public/profile/${imgName}`,
      imageFile?.buffer as any,
    );

    const update: any = await findOneAndUpdateUser(body?.userInfo?._id, { img: imgName });

    return res.status(200).json({
      message: 'User updated successfully',
      data: update,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleUserAddRemoveFriend(req: Request, res: Response) {
  try {
    const { body } = req;
    const { friendId, type, userInfo } = body ?? {};

    if (userInfo?._id === friendId) {
      return res.status(500).json({
        message: 'You can add yourself as friend!',
      });
    }

    const query: any = await findOneAndUpdateUser(
      userInfo?._id,
      type === 'UNFRIEND'
        ? { $pull: { friends: friendId } }
        : { $addToSet: { friends: friendId } },
    );

    // { $pull: { friends: body?.friendToRemoveId } },

    return res.status(200).json({
      message: `User ${type === 'UNFRIEND' ? 'removed' : 'ADDED'} to friend list successfully`,
      data: query,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetUserFriends(req: Request, res: Response) {
  try {
    const { body } = req;
    const query: any = await findUserFriendsDetails(
      body?.userInfo?._id,
    );

    return res.status(200).json({
      message: 'Friend list fetched successfully',
      data: query?.friends ?? [],
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetLeaderboard(req: Request, res: Response) {
  try {
    const { query, body } = req;
    const { type, leaderBoardType, ...basicQuery } = query ?? {};

    let startTime: any = '';

    if (type === 'WEEK') {
      startTime = getStartDate('WEEK', 'date');
    }
    if (type === 'MONTH') {
      startTime = getStartDate('MONTH', 'date');
    }

    if (type === '3MONTH') {
      startTime = getStartDate('3MONTH', 'date');
    }

    if (type === 'YEAR') {
      startTime = getStartDate('YEAR', 'date');
    }

    const matchQuery: any = {
      _id: new mongoose.Types.ObjectId(body?.userInfo?._id),
    };

    let leaderBoard: any = [];

    if (leaderBoardType === 'FRIEND' || leaderBoardType === 'PLAYER') {
      leaderBoard = await findLeaderboard({
        leaderBoardType: leaderBoardType as ILeaderBoardType,
        matchQuery: leaderBoardType === 'FRIEND' ? { $match: matchQuery } : {},
        timeQuery: type
          ? {
            $match: {
              'claims.createdAt': { $gte: startTime }, // Possibly claims were the last updated
            },
          } : {},
        basicQuery: basicQuery as IDBQuery,
      });
    } else if (leaderBoardType === 'ORGANIZER') {
      leaderBoard = await findOrganisersLeaderboard(
        type ? { $match: { decisionTime: { $gte: startTime } } } as IDBQuery : {},
        basicQuery as IDBQuery,
      );
    }

    return res.status(200).json({
      message: 'Leader board fetched successfully',
      data: leaderBoard ?? [],
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handlePostBlacklist(req: Request, res: Response) {
  try {
    const update: any = await addBlacklistUserEvents(req.body);
    return res.status(200).json({
      message: 'This Organizer is Blacklisted successfully',
      data: update,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}

export async function handlePatchUnBlacklist(req: Request, res: Response) {
  try {
    const update: any = await removeBlacklistUserEvents(req.body);
    return res.status(200).json({
      message: 'This Organizer is Blacklisted successfully',
      data: update,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}

export async function handleGetIsBlacklisted(req: Request, res: Response) {
  try {
    const { userInfo: { _id: userId } } = req.body;
    const { eventId } = req.params;

    const isBlacklisted: boolean | undefined = await IsBlacklistedInUserEvent(userId, eventId);
    return res.status(200).json({
      message: isBlacklisted ? 'This User is Blacklisted in this Event.' : 'User is whitelisted in this Event.',
      data: { isBlacklisted },
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? wentWrong,
    });
  }
}

export async function handleGetWallet(req: Request, res: Response) {
  try {
    const { body } = req;
    const user: any = await findUserClaims(
      body?.userInfo?._id,
    );

    const plays = await findPlaysWithDetails(
      { playBy: body?.userInfo?._id },
      {
        amount: 1, _id: 1, createdAt: 1, type: 'PLAY', event: 1,
      },
      { sort: { createdAt: -1 }, limit: 100 },
    );

    let transactions: any[] = [...plays];
    if (user && Array.isArray(user) && user.length && user[0].claims
      && Array.isArray(user[0].claims)) {
      transactions = transactions.concat(user[0].claims);
      delete user[0].claims;
    }

    transactions.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return res.status(200).json({
      message: 'Wallet details fetched successfully',
      data: { user, transactions },
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
