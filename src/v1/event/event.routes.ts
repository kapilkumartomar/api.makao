import express from 'express';
import multer from 'multer';
import { web3Auth } from '@config/web3Auth';

import { validate } from '@config/validate';
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
  handleUpdateEventFormData,
} from './event.controller';
import { validateCreateComment, validateCreateEvent, validateUpdateEvent } from './event.validation';

const routes = express.Router();
const upload = multer();

routes.post(
  '/',
  upload.fields([{ name: 'img', maxCount: 1 }]),
  web3Auth,
  validate(validateCreateEvent),
  handleCreateEvent,
);

routes.get(
  '/',
  web3Auth,
  handleGetEvents,
);

routes.get(
  '/user',
  web3Auth,
  handleGetUserEvents,
);

routes.get(
  '/friends',
  web3Auth,
  handleGetFriendsEvents,
);

routes.get(
  '/search',
  web3Auth,
  handleSearchEventsUsersCategories,
);

routes.get('/:_id', web3Auth, handleGetEvent);

routes.patch('/:_id', web3Auth, validate(validateUpdateEvent), handleUpdateEvent);
routes.patch('/:_id/formData', upload.fields([{ name: 'img', maxCount: 1 }]), web3Auth, validate(validateUpdateEvent), handleUpdateEventFormData);

routes.post('/:_id/comment', web3Auth, validate(validateCreateComment), handleCreateComment);

routes.get('/:_id/comment', web3Auth, handleGetComments);
routes.get('/:_id/comment/friends', web3Auth, handleGetFriendsComments);

routes.get('/:_id/players', web3Auth, handleGetPlayers);

routes.post('/:_id/claims', web3Auth, handlePlayerClaims);

routes.post('/:_id/decision/win', web3Auth, handleEventDecisionWin);
routes.post('/:_id/decision/refund', web3Auth, handleEventDecisionRefund);
routes.post('/:_id/user/:userId/refund', web3Auth, handleUserRefundAndKick);

module.exports = routes;
