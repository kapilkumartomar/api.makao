import express from 'express';

import { validate } from '@config/validate';
import { web3Auth } from '@config/web3Auth';
import multer from 'multer';
import {
  handleUserSignIn, handleUserSignUp, handleUserUpdate, handleUsersSearch,
  handleGetUser, handleUpdateUserProfile, handleGetUserFriends,
  handleGetLeaderboard,
  handleGetOtherUser,
  handleGetWallet,
  handlePostBlacklist, handlePatchUnBlacklist, handleGetIsBlacklisted, handleUserAddRemoveFriend,
  handleCryptoSignUp,
} from './user.controller';
import {
  validateEmail,
  // validateEmailQuery,
  validatePassword,
} from '../../util/commonValidations';

const upload = multer();
const routes = express.Router();

routes.get('/', web3Auth, handleGetUser);
routes.post('/', validate([validateEmail, validatePassword]), handleUserSignUp);
routes.patch('/', web3Auth, handleUserUpdate);
routes.patch('/img', upload.fields([{ name: 'img', maxCount: 1 }]), web3Auth, handleUpdateUserProfile);
routes.patch('/blacklist', web3Auth, handlePostBlacklist);
routes.patch('/unblacklist', web3Auth, handlePatchUnBlacklist);

routes.get('/isblacklisted/:eventId', web3Auth, handleGetIsBlacklisted);

routes.post('/sign-in', validate([validateEmail, validatePassword]), handleUserSignIn);
routes.get('/search', handleUsersSearch);
routes.post('/friend', web3Auth, handleUserAddRemoveFriend);
routes.get('/friends', web3Auth, handleGetUserFriends);
routes.get('/wallet', web3Auth, handleGetWallet);

routes.post('/cryptoSignup', handleCryptoSignUp);
routes.get('/leaderboard', web3Auth, handleGetLeaderboard);
// routes.get('/leaderboard/friends', web3Auth, handleGetLeaderboard);
// routes.get('/leaderboard/organisers', web3Auth, handleGetOrganisersLeaderboard);

routes.get('/:_id', web3Auth, handleGetOtherUser);

module.exports = routes;
