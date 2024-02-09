import { Request, Response } from 'express';

import { wentWrong } from '@util/helper';
import { createNotifications, findNotifications } from './notification.resources';

export async function handleGetNotifications(req: Request, res: Response) {
  try {
    const { body, query } = req;
    const notifications: any = await findNotifications(body?.userInfo?._id, query);

    return res.status(200).json({
      message: 'Notifications fetched successfully',
      data: notifications,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleNotifications(req: Request, res: Response) {
  try {
    const notifications: any = await createNotifications([]);

    return res.status(200).json({
      message: 'Notification created successfully',
      data: notifications,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
