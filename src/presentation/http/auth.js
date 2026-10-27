import { createHash, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError } from '../../domain/errors.js';

const digest = (value) => createHash('sha256').update(value).digest();

/** Extracts the API key from `Authorization: Bearer <key>` or `X-API-Key`. */
export function extractApiKey(req) {
  const header = req.get('authorization');
  if (header) {
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) return token.trim();
  }
  return req.get('x-api-key')?.trim() || null;
}

/**
 * Builds an API key verifier. Keys are compared as SHA-256 digests with
 * timingSafeEqual, so neither key length nor content leaks through timing.
 * @param {{ enabled: boolean, apiKeys: readonly string[] }} authConfig
 */
export function createApiKeyVerifier(authConfig) {
  const digests = authConfig.apiKeys.map(digest);
  return (req) => {
    if (!authConfig.enabled) return true;
    const key = extractApiKey(req);
    if (!key) return false;
    const candidate = digest(key);
    let valid = false;
    for (const known of digests) valid = timingSafeEqual(candidate, known) || valid;
    return valid;
  };
}

/** Express middleware rejecting requests without a valid API key. */
export function requireApiKey(verify) {
  return (req, res, next) => (verify(req) ? next() : next(new UnauthorizedError()));
}
