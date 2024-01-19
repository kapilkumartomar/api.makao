import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import { createChallenge } from './challenge.resources';

export async function handleCreateChallenge(req: Request, res: Response) {
  try {
    const { body } = req;

    const challenge = await createChallenge({ ...body, createdBy: body.userInfo?._id });

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
