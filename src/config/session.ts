/** Lifetime of each refresh token; every rotation issues a new one. */
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
/** Absolute session limit: rotations never extend a session past this, counted from login. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/**
 * A token rotated this recently is still accepted while its session is alive, so two
 * tabs refreshing at the same moment do not look like a stolen token. Older reuse
 * revokes the whole session.
 */
export const REUSE_GRACE_MS = 10 * 1000; // 10 seconds
