import express from 'express';

import { auth } from '@config/auth';
import {
  handleGetCategories,
} from './category.controller';

const routes = express.Router();

routes.get('/', auth, handleGetCategories);

module.exports = routes;
