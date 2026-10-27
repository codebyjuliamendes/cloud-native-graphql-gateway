import { AppError } from '../../domain/errors.js';

/**
 * Global Express error handler. Known errors (AppError) are returned with
 * their status and message; anything else becomes a generic 500 so stack
 * traces and internal messages never reach clients.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const log = req.log ?? console;

  // Body parser errors (malformed JSON, payload too large) carry a status.
  if (!(err instanceof AppError) && err.type && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      status: 'error',
      code: err.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
      message: err.status === 413 ? 'Request body too large' : 'Malformed request body',
      requestId: req.id,
    });
  }

  if (err instanceof AppError) {
    if (err.status >= 500) log.warn({ err }, err.message);
    if (err.status === 503) res.setHeader('Retry-After', '10');
    return res.status(err.status).json({
      status: 'error',
      code: err.code,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
      requestId: req.id,
    });
  }

  log.error({ err }, 'Unhandled error');
  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error',
    requestId: req.id,
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Route not found', requestId: req.id });
};
