import express from 'express';
import multer from 'multer';
import { web3Auth } from '@config/web3Auth';

import {
  handleGetReview,
  handleIsReviewGiven,
  handlePostReview,
} from './review.controller';

const routes = express.Router();
const upload = multer();

routes.get('/', web3Auth, handleGetReview);
routes.post('/', upload.fields([{ name: 'img', maxCount: 1 }]), web3Auth, handlePostReview);
routes.get('/:eventId/:challengeId', web3Auth, handleIsReviewGiven);

module.exports = routes;
