import { body, query } from 'express-validator';

export const validateEmail = body('email').trim()
  .isEmail().withMessage('Email should be valid email.');

export const validateEmailQuery = query('email').trim()
  .isEmail().withMessage('Email should be valid email.');

export const validatePassword = body('password').isLength({ min: 6 }).withMessage('Password should have atleast 6 character')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[!@#$%^&*(),.?":{}|<>]/)
  .withMessage('Password must contain at least one special character');
