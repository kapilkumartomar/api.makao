import express from 'express';

import { auth } from '@config/auth';
import {
  handleCreatePlay,
} from './play.controller';

const routes = express.Router();

routes.post(
  '/',
  auth,
  handleCreatePlay,
);

module.exports = routes;
