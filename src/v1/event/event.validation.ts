/* eslint-disable no-restricted-syntax */
import { body, check } from 'express-validator';

export const validateCreateEvent = [
  body('name').not().isEmpty(),
  body('description').not().isEmpty(),
  body('startTime').not().isEmpty(),
  body('endTime').not().isEmpty(),
  body('decisionTime').not().isEmpty(),
  body('challenges')
    .custom((challenges) => {
      const rawChallenges = JSON.parse(challenges);
      if (!Array.isArray(rawChallenges)) {
        throw new Error('Challenges must be an array');
      }

      for (const challenge of rawChallenges) {
        if (
          typeof challenge !== 'object'
          || typeof challenge.title !== 'string'
          || typeof challenge.logic !== 'string'
          || challenge.title.trim() === ''
          || challenge.logic.trim() === ''
        ) {
          throw new Error('Each challenge must have "title" and "logic" properties of type string');
        }
      }

      return true;
    }),
  // body('category').not().isEmpty(),
];

export const validateCreateComment = [
  check('_id').not().isEmpty(),
  body('text').not().isEmpty(),
];

export const validateUpdateEvent = [
  check('_id').not().isEmpty(),
  // body('videoLink').exists().notEmpty(),
];
