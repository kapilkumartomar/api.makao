import express from 'express';
import { web3Auth } from '@config/web3Auth';

import {
  handleCreatePlay,
} from './play.controller';

const routes = express.Router();

routes.post(
  '/',
  web3Auth,
  handleCreatePlay,
);

module.exports = routes;
