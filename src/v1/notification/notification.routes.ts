import express from 'express';

import { auth } from '@config/auth';
import {
  handleGetNotifications,
} from './notification.controller';

const routes = express.Router();

routes.get('/', auth, handleGetNotifications);

module.exports = routes;
