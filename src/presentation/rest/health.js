import { Router } from 'express';
import { renderLandingPage } from './landingPage.js';

/**
 * @param {{
 *   ping: () => boolean,
 *   isShuttingDown: () => boolean,
 *   links: { graphql: boolean, apiDocs: boolean },
 * }} deps
 */
export function createHealthRoutes({ ping, isShuttingDown, links }) {
  const router = Router();
  const landingPage = renderLandingPage(links);

  router.get('/', (req, res) => {
    res.type('html').send(landingPage);
  });

  /** Liveness: the process is up and the event loop answers. */
  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  /** Readiness: accepts traffic only when the database answers and we are not draining. */
  router.get('/ready', (req, res) => {
    if (isShuttingDown()) return res.status(503).json({ status: 'Shutting down' });
    try {
      ping();
      return res.status(200).json({ status: 'Ready' });
    } catch (err) {
      req.log?.error({ err }, 'Readiness check failed');
      return res.status(503).json({ status: 'Not ready' });
    }
  });

  return router;
}
