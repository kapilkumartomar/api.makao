import express from 'express';

import { auth } from '@config/auth';
import {
  handleCreateChallenge,
} from './challenge.controller';

const routes = express.Router();

routes.post(
  '/',
  auth,
  handleCreateChallenge,
);

module.exports = routes;
