/* eslint-disable no-console */
/* eslint-disable no-unsafe-optional-chaining */

import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import { createChallenge, updateChallenge } from './challenge.resources';
import { createNotifications } from '../notification/notification.resources';

export async function handleCreateChallenge(req: Request, res: Response) {
  try {
    const { body } = req;
    const status = body?.createdBy === body?.userInfo?._id;
    const challenge = await createChallenge({ ...body, status, createdBy: body.userInfo?._id });

    return res.status(200).json({
      message: 'Challenge created successfully',
      data: challenge,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleUpdateChallenge(req: Request, res: Response) {
  try {
    const { body, params: { _id } } = req;
    const challenge = await updateChallenge(_id, body);

    // Sending update notification to the user who proposal the challenge
    if (body?.status || body?.status === false) {
      createNotifications([{
        type: 'PROPOSAL_STATUS',
        for: challenge?.createdBy,
        metaData: {
          eventId: challenge?.event,
          status: challenge?.status,
        },
      }]);
    }

    return res.status(200).json({
      message: 'Challenge Update successfully',
      data: challenge,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
