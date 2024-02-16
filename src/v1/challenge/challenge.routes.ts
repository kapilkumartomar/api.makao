import express from 'express';

import { auth } from '@config/auth';
import {
  handleChallengeRefund,
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

routes.post(
  '/:_id/refund',
  auth,
  handleChallengeRefund,
);

module.exports = routes;
