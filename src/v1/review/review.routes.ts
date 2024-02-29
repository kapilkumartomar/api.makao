import express from 'express';
import { web3Auth } from '@config/web3Auth';

import {
  handleGetReview,
  handleIsReviewGiven,
  handlePostReview,
} from './review.controller';

const routes = express.Router();

routes.get('/', web3Auth, handleGetReview);
routes.get('/:eventId', web3Auth, handleIsReviewGiven);
routes.post('/', handlePostReview);

module.exports = routes;
