/* eslint-disable prefer-destructuring */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  IDBQuery, generateUniqueString, getStartDate, wentWrong,
} from '@util/helper';
import fs from 'fs/promises';
import {
  createUser, findFriendsLeaderboard, findOrganisersLeaderboard, findOneAndUpdateUser,
  findUser, findUserById, findUserFriendsDetails, findUsers, findLeaderboard,
} from './user.resources';

const BCRYPT_SALT = 10;

let dirname = __dirname;
const dirnameSplit = dirname.split('src');
if (!dirnameSplit[1]) dirname = dirname.split('dist')[0];
else dirname = dirname.split('src')[0];

export async function handleUserSignIn(req: Request, res: Response) {
  try {
    const query: any = await findUser(req.body);
    if (!query?._id) {
      return res.status(400).json({
        message: "Email does't exist",
      });
    }

    const comparePasswrod = bcrypt.compareSync(
      req.body.password,
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
    const query: any = await findUser(req.body);
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
    const query: any = await findUsers({ email: email as string });

    return res.status(200).json({
      message: 'Users found successfully',
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
      message: 'User updated successfully',
      data: query,
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

export async function handleUserAddFriend(req: Request, res: Response) {
  try {
    const { body } = req;
    const query: any = await findOneAndUpdateUser(
      body?.userInfo?._id,
      { $addToSet: { friends: body?.newFriendId } },
    );

    return res.status(200).json({
      message: 'User add to friend list successfully',
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

export async function handleGetFriendsLeaderboard(req: Request, res: Response) {
  try {
    const { query } = req;
    const { type, ...basicQuery } = query ?? {};

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

    const friendsLeaderboard: any = await findFriendsLeaderboard(type ? {
      $match: {
        // Possibly claims were the last updated
        'claims.createdAt': { $gte: startTime },
      },
    } : {}, basicQuery as IDBQuery);

    return res.status(200).json({
      message: 'Friend leaderboard fetched successfully',
      data: friendsLeaderboard ?? [],
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetOrganisersLeaderboard(req: Request, res: Response) {
  const { query } = req;
  const { type, ...basicQuery } = query ?? {};

  try {
    // const currentDateISO = new Date().toISOString();
    const timeQuery: IDBQuery = {};

    if (type === 'WEEK') {
      timeQuery.decisionTime = { $gte: getStartDate('WEEK') };
    }
    if (type === 'MONTH') {
      timeQuery.decisionTime = { $gte: getStartDate('MONTH') };
    }

    if (type === '3MONTH') {
      timeQuery.decisionTime = { $gte: getStartDate('3MONTH') };
    }

    if (type === 'YEAR') {
      timeQuery.decisionTime = { $gte: getStartDate('YEAR') };
    }

    const events = await findOrganisersLeaderboard(
      type ? { $match: timeQuery } as IDBQuery : {},
      basicQuery as IDBQuery,
    );

    return res.status(200).json({
      message: 'Leaderboard fetched successfully',
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

export async function handleGetLeaderboard(req: Request, res: Response) {
  try {
    const { query } = req;
    const { type, ...basicQuery } = query ?? {};

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

    const playersLeaderboard: any = await findLeaderboard(type ? {
      $match: {
        // Possibly claims were the last updated
        'claims.createdAt': { $gte: startTime },
      },
    } : {}, basicQuery as IDBQuery);

    return res.status(200).json({
      message: 'Players leaderboard fetched successfully',
      data: playersLeaderboard ?? [],
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
