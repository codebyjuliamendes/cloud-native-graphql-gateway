import rateLimit from 'express-rate-limit';
import os from 'os';

const baseRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

export const rateLimiter = (req, res, next) => {
  const load = os.loadavg()[0];
  if (load > 0.8) {
    res.setHeader('Retry-After', '30');
    return res.status(503).json({ error: 'Service Unavailable: High CPU Load' });
  }
  return baseRateLimiter(req, res, next);
};
