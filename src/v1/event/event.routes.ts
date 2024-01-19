import express from 'express';
import multer from 'multer';

import { validate } from '@config/validate';
import { auth } from '@config/auth';
import {
  handleCreateComment,
  handleCreateEvent,
  handleGetComments,
  handleUpdateEvent,
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

routes.patch(
  '/:_id',
  auth,
  validate(validateUpdateEvent),
  handleUpdateEvent,
);

routes.post(
  '/:_id/comment',
  auth,
  validate(validateCreateComment),
  handleCreateComment,
);

routes.get(
  '/:_id/comment',
  auth,
  handleGetComments,
);

module.exports = routes;
