import { Request } from 'express';

export const wentWrong = 'Something went wrong! Please try again';
export const makaoPlatformFeePercentage = 2.5 / 100; // this value is in percentage

export type IDBQuery = {
  [key: string]: string | number | string[][] | { [key: string]: any };
};

export function queryGenerator(req: Request) {
  const limit = req.query?.limit ? Number(req.query?.limit) : 500;
  const offset = req.query?.page
    ? (Number(req.query?.page) - 1) * Number(limit)
    : 0;

  const sort = { createdAt: req.query?.sort === 'asc' ? 1 : -1 };

  return {
    sort,
    limit,
    offset,
  };
}

export interface IAnyObject {
  [key: string]: any;
}
