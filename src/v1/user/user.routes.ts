import express from 'express';

import { validate } from '@config/validate';
import { auth } from '@config/auth';
import multer from 'multer';
import {
  handleUserSignIn, handleUserSignUp, handleUserUpdate, handleUsersSearch,
  handleGetUser, handleUpdateUserProfile, handleUserAddFriend, handleGetUserFriends,
  handleGetFriendsLeaderboard,
} from './user.controller';
import {
  validateEmail,
  // validateEmailQuery,
  validatePassword,
} from '../../util/commonValidations';

const upload = multer();
const routes = express.Router();

routes.get('/', auth, handleGetUser);
routes.post('/', validate([validateEmail, validatePassword]), handleUserSignUp);
routes.patch('/', auth, handleUserUpdate);
routes.patch('/img', upload.fields([{ name: 'img', maxCount: 1 }]), auth, handleUpdateUserProfile);
routes.post('/sign-in', validate([validateEmail, validatePassword]), handleUserSignIn);
routes.get('/search', handleUsersSearch);
routes.post('/friend', auth, handleUserAddFriend);
routes.get('/friends', auth, handleGetUserFriends);
routes.get('/leaderboard', auth, handleGetFriendsLeaderboard);

module.exports = routes;
