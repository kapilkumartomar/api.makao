import express from 'express';
import { web3Auth } from '@config/web3Auth';

import {
  handleGetReview,
  handleIsReviewGiven,
  handlePostReview,
  handleValidatePlayerReview,
} from './review.controller';

const routes = express.Router();

routes.get('/', web3Auth, handleGetReview);
if (process.env.NODE_ENV === 'development') { routes.get('/validateplayers', handleValidatePlayerReview); } // for testing purpose.
routes.get('/:eventId', web3Auth, handleIsReviewGiven);
routes.post('/', web3Auth, handlePostReview);

module.exports = routes;
