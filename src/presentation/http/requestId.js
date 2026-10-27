import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[\w.:-]{1,128}$/;

/**
 * Reuses a well-formed incoming X-Request-Id (so ids propagate across
 * services) or generates a new one, and echoes it in the response.
 */
export function requestId(req, res, next) {
  const incoming = req.get(REQUEST_ID_HEADER);
  req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}
