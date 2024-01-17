import express from 'express';
import multer from 'multer';

import { validate } from '@config/validate';
import { auth } from '@config/auth';
import {
  handleCreateEvent,
} from './event.controller';
import { validateCreateEvent } from './event.validation';

const routes = express.Router();
const upload = multer();

routes.post(
  '/',
  upload.fields([{ name: 'img', maxCount: 1 }]),
  auth,
  validate(validateCreateEvent),
  handleCreateEvent,
);

module.exports = routes;
