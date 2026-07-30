import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.get('/ready', (req, res) => {
  // In a real app, you would check DB connection here
  res.status(200).json({ status: 'Ready' });
});

export default router;
