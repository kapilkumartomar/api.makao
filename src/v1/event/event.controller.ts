import { Request, Response } from 'express';
import fs from 'fs/promises';

import { createEvent } from './event.resources';

let dirname = __dirname;
// eslint-disable-next-line prefer-destructuring
dirname = dirname.split('src')[0];

export async function handleCreateEvent(req: Request, res: Response) {
  try {
    const { files, body } = req as any;
    const imageFile: any = files?.img[0];

    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const imgName = `img-${body.userInfo._id}-${uniquePrefix}-${imageFile?.originalname}`;

    await fs.writeFile(
      `${dirname}public/images/${imgName}`,
      imageFile?.buffer as any,
    );

    body.challenges = JSON.parse(body.challenges);
    const event = await createEvent({ ...body, img: imgName });

    return res.status(200).json({
      message: 'Event created successfully',
      data: event,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? 'Something went wrong! try again later',
    });
  }
}
