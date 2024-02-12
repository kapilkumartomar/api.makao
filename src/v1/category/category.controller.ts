import { Request, Response } from 'express';

import { IDBQuery, wentWrong } from '@util/helper';
import { findCategories } from './category.resources';

export async function handleGetCategories(req: Request, res: Response) {
  try {
    const categories: any = await findCategories(req.query as IDBQuery);

    return res.status(200).json({
      message: 'Categories fetched successfully',
      data: categories,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
