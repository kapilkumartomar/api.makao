import express from 'express';

import { auth } from '@config/auth';
import {
  handleChallengeDecision,
  handleCreateChallenge,
} from './challenge.controller';

const routes = express.Router();

routes.post(
  '/',
  auth,
  handleCreateChallenge,
);

routes.post(
  '/:_id/decision',
  auth,
  handleChallengeDecision,
);

module.exports = routes;
