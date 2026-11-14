import { createHash, randomBytes } from 'node:crypto'

export default class RefreshToken {
  static generate(): { token: string, hash: string } {
    const token = randomBytes(32).toString('base64url')
    return { token, hash: RefreshToken.hash(token) }
  }

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}