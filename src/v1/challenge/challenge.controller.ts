import { Request, Response } from 'express';

import { createChallenge } from './challenge.resources';

export async function handleCreateEvent(req: Request, res: Response) {
  try {
    const { body } = req;

    const challenge = await createChallenge({ ...body, createdBy: body.userInfo?._id });

    return res.status(200).json({
      message: 'Challenge created successfully',
      data: challenge,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? 'Something went wrong! try again later',
    });
  }
}
