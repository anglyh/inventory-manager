import jwt from "jsonwebtoken";
import { env } from '../config.js';

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
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