import express from 'express';

import { auth } from '@config/auth';
import {
  handleGetReview,
  handleIsReviewGiven,
  handlePostReview
} from './review.controller';

const routes = express.Router();

routes.get('/', auth, handleGetReview);
routes.get('/:userId/:eventId', auth, handleIsReviewGiven);
routes.post('/', auth, handlePostReview);

module.exports = routes;
