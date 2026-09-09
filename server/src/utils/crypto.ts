import crypto from "crypto";

/**
 * Generates a cryptographically secure random token.
 * Returns a 64-character hex string (256 bits of entropy).
 */
export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Produces a SHA-256 hash of the given token in hex format.
 * Used to store hashed verification / reset tokens in the database.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Constant-time comparison of two strings.
 * Returns true if they are equal, false otherwise.
 * Prevents timing attacks on token comparisons.
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};
