import express from 'express';
import multer from 'multer';

import { validate } from '@config/validate';
import { auth } from '@config/auth';
import {
  handleCreateComment,
  handleCreateEvent,
  handleEventDecisionRefund,
  handleEventDecisionWin,
  handleUserRefundAndKick,
  handleGetComments,
  handleGetEvent,
  handleGetEvents,
  handleGetFriendsEvents,
  handleGetPlayers,
  handleGetUserEvents,
  handleSearchEventsUsersCategories,
  handleUpdateEvent,
  handlePlayerClaims,
  handleGetFriendsComments,
} from './event.controller';
import { validateCreateComment, validateCreateEvent, validateUpdateEvent } from './event.validation';

const routes = express.Router();
const upload = multer();

routes.post(
  '/',
  upload.fields([{ name: 'img', maxCount: 1 }]),
  auth,
  validate(validateCreateEvent),
  handleCreateEvent,
);

routes.get(
  '/',
  auth,
  handleGetEvents,
);

routes.get(
  '/user',
  auth,
  handleGetUserEvents,
);

routes.get(
  '/friends',
  auth,
  handleGetFriendsEvents,
);

routes.get(
  '/search',
  auth,
  handleSearchEventsUsersCategories,
);

routes.get('/:_id', auth, handleGetEvent);

routes.patch('/:_id', auth, validate(validateUpdateEvent), handleUpdateEvent);

routes.post('/:_id/comment', auth, validate(validateCreateComment), handleCreateComment);

routes.get('/:_id/comment', auth, handleGetComments);
routes.get('/:_id/comment/friends', auth, handleGetFriendsComments);

routes.get('/:_id/players', auth, handleGetPlayers);

routes.post('/:_id/claims', auth, handlePlayerClaims);

routes.post('/:_id/decision/win', auth, handleEventDecisionWin);
routes.post('/:_id/decision/refund', auth, handleEventDecisionRefund);
routes.post('/:_id/user/:userId/refund', auth, handleUserRefundAndKick);

module.exports = routes;
