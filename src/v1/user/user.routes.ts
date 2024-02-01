import express from 'express';

import { validate } from '@config/validate';
import { auth } from '@config/auth';
import {
  handleUserSignIn, handleUserSignUp, handleUserUpdate, handleUsersSearch,
} from './user.controller';
import {
  validateEmail,
  // validateEmailQuery,
  validatePassword,
} from '../../util/commonValidations';

const routes = express.Router();

routes.post('/sign-in', validate([validateEmail, validatePassword]), handleUserSignIn);
routes.post('/', validate([validateEmail, validatePassword]), handleUserSignUp);
routes.patch('/', auth, handleUserUpdate);
routes.get('/search', handleUsersSearch);

module.exports = routes;
