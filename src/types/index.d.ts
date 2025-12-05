import "express";
import type { TokenPayload } from "../lib/jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}
