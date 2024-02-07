import { IAnyObject } from '@util/helper';
import Notification from './notification.model';

export async function findNotifications(query: { status?: boolean }) {
  return Notification.find(query);
}

export async function createNotifications(payload: IAnyObject[]) {
  return Notification.insertMany(payload);
}
