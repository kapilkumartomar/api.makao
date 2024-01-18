import express from 'express';

import { auth } from '@config/auth';
import {
  handleCreateEvent,
} from './challenge.controller';

const routes = express.Router();

routes.post(
  '/',
  auth,
  handleCreateEvent,
);

module.exports = routes;
