import express from 'express';

import {
  handleUserSignIn, handleUserSignUp,
} from './user.controller';

const routes = express.Router();

routes.post('/sign-in', handleUserSignIn);
routes.post('/sign-up', handleUserSignUp);

module.exports = routes;
