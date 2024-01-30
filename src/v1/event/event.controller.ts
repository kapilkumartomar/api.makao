/* eslint-disable max-len */
import { Request, Response } from 'express';
import fs from 'fs/promises';

import { IDBQuery, wentWrong } from '@util/helper';
import {
  createEvent, createEventComments, getEvent, getEventComments, getEvents, getEventsAndPlays, updateEvent,
} from './event.resources';
import { createChallenges } from '../challenge/challenge.resources';
import { IChallenge } from '../challenge/challenge.model';
import { IEvent } from './event.model';

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
      message: ex?.message ?? wentWrong,
    });
  }
}

// Create a comment for an event
export async function handleCreateComment(req: Request, res: Response) {
  const { body, params } = req;
  const eventId = params._id;

  try {
    const updatedEvent = await createEventComments(eventId as any, { ...body, createdBy: body.userInfo?._id });

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Comment created successfully',
      data: req.body,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

// Create a comment for an event
export async function handleGetComments(req: Request, res: Response) {
  const { query, params } = req;
  const eventId = params._id;

  try {
    const eventComments = await getEventComments(eventId as any, query);

    if (!eventComments) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Comment fetched successfully',
      data: eventComments,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

// updte an event
export async function handleUpdateEvent(req: Request, res: Response) {
  const { body, params } = req;
  const eventId = params._id;

  try {
    const updatedEvent = await updateEvent(eventId as any, body);

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Event updated successfully',
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetEvents(req: Request, res: Response) {
  const { query, body } = req;
  const { type, ...basicQuery } = query ?? {};

  const rawQuery: IDBQuery = {};
  if (type === 'ORGANISED') {
    rawQuery.createdBy = body?.userInfo?._id;
  }

  try {
    const events = await getEvents(rawQuery, basicQuery as IDBQuery);

    return res.status(200).json({
      message: 'Events fetched successfully',
      data: events,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetUserEvents(req: Request, res: Response) {
  const { query, body } = req;
  const { type, ...basicQuery } = query ?? {};
  const currentDateISO = new Date().toISOString();
  const rawQuery: IDBQuery = {};

  if (type === 'CURRENT') {
    rawQuery.startTime = { $lte: currentDateISO };
    rawQuery.decisionTime = { $gte: currentDateISO };
  }
  if (type === 'HISTORY') {
    rawQuery.decisionTime = { $lt: currentDateISO };
  }

  try {
    const events = await getEventsAndPlays({ $match: rawQuery }, basicQuery as IDBQuery, body?.userInfo?._id);

    return res.status(200).json({
      message: 'User Events fetched successfully',
      data: events,
      page: query?.page ? Number(query?.page) : 1,
      pageSize: query?.pageSize ? Number(query?.pageSize) : 20,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}

export async function handleGetEvent(req: Request, res: Response) {
  const { params, body } = req;

  try {
    const events = await getEvent(params?._id, body?.userInfo?._id);
    const singleEvent = Array.isArray(events) ? events[0] as IEvent : {} as IEvent;
    const { img } = singleEvent;
    singleEvent.img = `${process.env.API_URL}images/${img}`;

    return res.status(200).json({
      message: 'Event fetched successfully',
      data: singleEvent,
    });
  } catch (ex: any) {
    return res.status(500).json({
      message: ex?.message ?? wentWrong,
    });
  }
}
