import express from 'express';

import { auth } from '@config/auth';
import {
  handleCreateChallenge,
  handleUpdateChallenge,
} from './challenge.controller';

const routes = express.Router();

routes.post(
  '/',
  auth,
  handleCreateChallenge,
);

routes.patch(
  '/:_id',
  auth,
  handleUpdateChallenge,
);

module.exports = routes;
