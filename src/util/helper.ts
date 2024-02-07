/* eslint-disable no-plusplus */

import { FilterQuery, UpdateQuery } from 'mongoose';

export const wentWrong = 'Something went wrong! Please try again';
export const makaoPlatformFeePercentage = 2.5 / 100; // this value is in percentage

export type IDBQuery = {
  [key: string]: string | number | string[][] | { [key: string]: any };
};

export function basicQueryGenerator(query: IDBQuery) {
  const {
    page, pageSize, sortAt = 'createdAt', sortType = 'dsc',
  } = query ?? {};

  const limit = pageSize ? Number(pageSize) : 20; // Default to 20 events per page
  const offset = page
    ? (Number(page) - 1) * Number(limit)
    : 0;

  const sortOrder = { [sortAt as string]: sortType === 'dsc' ? -1 : 1 };

  return {
    sort: sortOrder,
    limit,
    offset,
  };
}

export function aggregateBasicQueryGenerator(query: IDBQuery) {
  const {
    page, pageSize, sortAt = 'createdAt', sortType = 'dsc',
  } = query ?? {};

  const limit = pageSize ? Number(pageSize) : 20; // Default to 20 events per page
  const offset = page
    ? (Number(page) - 1) * Number(limit)
    : 0;

  const sortOrder = { [sortAt as string]: sortType === 'dsc' ? -1 : 1 };

  return [
    { $limit: limit },
    { $skip: offset },
    { $sort: sortOrder },
  ];
}

export interface IAnyObject {
  [key: string]: any;
}

export interface BulkWriteOperation {
  updateOne: {
    filter: FilterQuery<IAnyObject>;
    update: UpdateQuery<IAnyObject> | Partial<IAnyObject>;
    options?: any;
  };
}

export function generateUniqueString(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

export function getStartDate(interval: 'WEEK' | 'MONTH' | '3MONTH' | 'YEAR', type?: 'date'): string | Date {
  const currentDate = new Date();

  switch (interval) {
    case 'WEEK':
      currentDate.setDate(currentDate.getDate() - 7);
      break;
    case 'MONTH':
      currentDate.setMonth(currentDate.getMonth() - 1);
      break;
    case '3MONTH':
      currentDate.setMonth(currentDate.getMonth() - 3);
      break;
    case 'YEAR':
      currentDate.setFullYear(currentDate.getFullYear() - 1);
      break;
    default: /* eslint-disable-next-line no-unused-expressions */
      currentDate;
    // 'DAY' is the default case
  }

  if (type === 'date') return currentDate;

  return currentDate.toISOString();
}
