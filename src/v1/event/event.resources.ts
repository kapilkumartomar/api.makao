import Event, { IEvent } from './event.model';

export async function createEvent(payload: IEvent) {
  return Event.create(payload);
}
