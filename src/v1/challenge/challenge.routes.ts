import express from 'express';
import { web3Auth } from '@config/web3Auth';

import {
  handleChallengeRefund,
  handleCreateChallenge,
  handleUpdateChallenge,
} from './challenge.controller';

const routes = express.Router();

routes.post(
  '/',
  web3Auth,
  handleCreateChallenge,
);

routes.patch(
  '/:_id',
  web3Auth,
  handleUpdateChallenge,
);

routes.post(
  '/:_id/refund',
  web3Auth,
  handleChallengeRefund,
);

module.exports = routes;
