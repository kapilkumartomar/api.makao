import express from 'express';
import { web3Auth } from '@config/web3Auth';

import {
  handleGetCategories,
} from './category.controller';

const routes = express.Router();

routes.get('/', web3Auth, handleGetCategories);

module.exports = routes;
