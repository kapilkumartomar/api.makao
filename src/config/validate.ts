/* eslint-disable import/prefer-default-export */

import express from 'express';
import { validationResult, ValidationChain } from 'express-validator';
// can be reused by many routes

// parallel processing
export const validate = (validations: ValidationChain[]) => async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({ errors: errors.array() });
};
