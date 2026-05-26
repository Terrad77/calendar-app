import { TokenPayload } from './auth.types.js';

declare global {
  namespace Express {
    interface User extends TokenPayload {}
    interface Request {
      user?: TokenPayload;
    }
  }
}
