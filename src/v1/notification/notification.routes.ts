import express from 'express';
import { web3Auth } from '@config/web3Auth';

import {
  handleGetNotifications,
} from './notification.controller';

const routes = express.Router();

routes.get('/', web3Auth, handleGetNotifications);

module.exports = routes;
