import express from 'express';

import { validate } from '@config/validate';
import {
  handleUserSignIn, handleUserSignUp,
} from './user.controller';
import { validateEmail, validatePassword } from '../../util/commonValidations';

const routes = express.Router();

routes.post('/sign-in', validate([validateEmail, validatePassword]), handleUserSignIn);
routes.post('/', validate([validateEmail, validatePassword]), handleUserSignUp);

module.exports = routes;
