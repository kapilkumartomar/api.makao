import { Request } from 'express';

export const wentWrong = 'Something went wrong! Please try again';

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
