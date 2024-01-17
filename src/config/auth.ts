/* eslint-disable no-console */
import { Response, Request, NextFunction } from 'express';

import jsonWebToken from 'jsonwebtoken';

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    if (
      req.headers.authorization
      && req.headers.authorization.split(' ')[0] === 'Bearer'
    ) {
      const verify = jsonWebToken.verify(
        req.headers.authorization.split(' ')[1],
        process.env.JWT_STRING as string,
      );

      console.log('userinf', verify);
      if (verify) {
        req.body.userInfo = verify as any;
        return next();
      }
      return res
        .status(401)
        .json({ responeCode: 401, message: 'Token is not valid' });
    }
    return res.status(401).json({
      responeCode: 401,
      message: 'Please provide a valid authorizaiton token',
    });
  } catch (ex: any) {
    if (ex.name === 'TokenExpiredError' || ex.message === 'jwt malformed' || ex.message === 'invalid signature') {
      return res.status(401).json({
        responeCode: 401,
        message: 'Your session is expired, please login again',
      });
    }
    return res.status(500).json({
      responeCode: 500,
      message: 'Something went wrong with authorization! Please try again',
    });
  }
}
