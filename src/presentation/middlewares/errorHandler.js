import { logger } from '../../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  if (err.message.includes('not found')) {
    return res.status(404).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal Server Error' });
};
