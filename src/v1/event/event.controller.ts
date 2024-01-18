/* eslint-disable max-len */
import { Request, Response } from 'express';
import fs from 'fs/promises';

import { createEvent } from './event.resources';
import { createChallenges } from '../challenge/challenge.resources';
import { IChallenge } from '../challenge/challenge.model';

let dirname = __dirname;
// eslint-disable-next-line prefer-destructuring
dirname = dirname.split('src')[0];

export async function handleCreateEvent(req: Request, res: Response) {
  try {
    const { files, body } = req as any;
    const imageFile: any = files?.img[0];

    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const imgName = `img-${body.userInfo?._id}-${uniquePrefix}-${imageFile?.originalname}`;

    await fs.writeFile(
      `${dirname}public/images/${imgName}`,
      imageFile?.buffer as any,
    );

    const reqChallenges = JSON.parse(body.challenges);
    delete body.challenges;
    const event = await createEvent({ ...body, img: imgName, createdBy: body.userInfo?._id });
    const challenges = await createChallenges(reqChallenges.map((val: IChallenge) => ({ ...val, createdBy: body.userInfo?._id, event: event?._id })));

    return res.status(200).json({
      message: 'Event created successfully',
      data: { ...event.toJSON(), challenges },
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? 'Something went wrong! try again later',
    });
  }
}
