import jwt from "jsonwebtoken";
import { env } from '../config.js';
import type { UserRole } from '../models/user.model.js';

export interface TokenPayload {
  userId: string;
  storeId: string;
  name: string;
  email: string;
  role: UserRole;
}

export default class JWT {
  private static readonly JWT_SECRET = env.JWT_SECRET;
  private static readonly JWT_EXPIRES = "7d";

  static signAccessToken(payload: TokenPayload): string {
    if (!this.JWT_SECRET) throw new Error("JWT_SECRET no esta definido");
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES })
  }

  static verifyAccessToken(token: string): TokenPayload {
    if (!this.JWT_SECRET) throw new Error("JWT_SECRET no esta definido");
    return jwt.verify(token, this.JWT_SECRET) as TokenPayload
  }
}