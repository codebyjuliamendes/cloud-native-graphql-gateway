import { logger } from '../../config/logger.js';

/**
 * Global Express error handling middleware
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Error caught in global handler');
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      details: err.details || err.message,
    });
  }

  if (err.message && err.message.toLowerCase().includes('not found')) {
    return res.status(404).json({
      status: 'error',
      message: err.message,
    });
  }

  // Handle unauthorized/forbidden if needed (example)
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
    });
  }

  // Default fallback for unhandled exceptions
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    correlationId: req.id, // Usually injected by pino-http
  });
};
