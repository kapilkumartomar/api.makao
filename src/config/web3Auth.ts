import { findUser } from '@user/user.resources';
import { Response, Request, NextFunction } from 'express';
import * as jose from 'jose';

export async function web3Auth(req: Request, res: Response, next: NextFunction) {
  try {
    const { headers } = req;
    if (
      headers.authorization
            && headers.authorization.split(' ')[0] === 'Bearer'
    ) {
      // passed from the frontend in the Authorization header
      const idToken: any = headers?.authorization?.split(' ')[1];

      // passed from the frontend in the request body
      const appPubKey: any = headers?.apppubkey ?? headers?.appPubKey;

      // Get the JWK set used to sign the JWT issued by Web3Auth
      const jwks = jose.createRemoteJWKSet(new URL('https://api-auth.web3auth.io/jwks'));

      // Verify the JWT using Web3Auth's JWKS
      const jwtDecoded: any = await jose.jwtVerify(idToken, jwks, { algorithms: ['ES256'] });

      if ((jwtDecoded.payload as any).wallets[0].public_key.toLowerCase() !== appPubKey?.toLowerCase()) {
        return res.status(401).json({ message: 'Verification Failed, public key does not match!' });
      }
      // Not a valid user
      if (!jwtDecoded?.payload?.verifierId) return res.status(401).json({ message: 'Verification Failed, Verifier Id does not found!' });

      // getting user details
      const found = await findUser({ 'web3Auth.verifierId': jwtDecoded?.payload?.verifierId }, { _id: 1 });
      if (found) {
        req.body.userInfo = { _id: found?._id?.toString() } as any;
        return next();
      }

      return res
        .status(500)
        .json({ message: 'Something went wrong with authorization! Please try again' });
    }

    return res.status(401).json({
      message: 'Please provide a valid authorizaiton token',
    });
  } catch (ex: any) {
    if (ex?.code === 'ERR_JWT_EXPIRED' || ex?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' || ex?.code === 'ERR_JWT_INVALID') {
      return res.status(401).json({
        message: 'Your session is expired, please login again',
      });
    }
    return res.status(500).json({
      message: 'Something went wrong with authorization! Please try again',
    });
  }
}
