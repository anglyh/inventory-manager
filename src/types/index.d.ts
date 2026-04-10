import type { TokenPayload } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      /** Relleno por `validateQuery` si usas ese middleware */
      validatedQuery?: unknown;
    }
  }
}

export {};