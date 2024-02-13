import express from 'express';

import { validate } from '@config/validate';
import { auth } from '@config/auth';
import multer from 'multer';
import {
  handleUserSignIn, handleUserSignUp, handleUserUpdate, handleUsersSearch,
  handleGetUser, handleUpdateUserProfile, handleUserAddFriend, handleGetUserFriends,
  handleGetFriendsLeaderboard,
  handleGetOrganisersLeaderboard,
  handleGetLeaderboard,
  handleGetOtherUser,
  handleGetWallet,
  handlePostBlacklist, handlePatchUnBlacklist, handleGetIsBlacklisted,
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
routes.patch('/blacklist', auth, handlePostBlacklist);
routes.patch('/unblacklist', auth, handlePatchUnBlacklist);
routes.get('/isblacklisted/:eventId', auth, handleGetIsBlacklisted);
routes.post('/sign-in', validate([validateEmail, validatePassword]), handleUserSignIn);
routes.get('/search', handleUsersSearch);
routes.post('/friend', auth, handleUserAddFriend);
routes.get('/friends', auth, handleGetUserFriends);
routes.get('/leaderboard', auth, handleGetLeaderboard);
routes.get('/wallet', auth, handleGetWallet);

routes.get('/:_id', auth, handleGetOtherUser);

routes.get('/leaderboard/organisers', auth, handleGetOrganisersLeaderboard);
routes.get('/leaderboard/friends', auth, handleGetFriendsLeaderboard);

module.exports = routes;
