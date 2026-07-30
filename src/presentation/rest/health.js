import { Router } from 'express';

const router = Router();

/**
 * Modern HTML Landing Page for the API
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cloud-Native API Gateway</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                primary: '#3b82f6',
              }
            }
          }
        }
      </script>
      <style>
        body { font-family: 'Inter', sans-serif; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); }
      </style>
    </head>
    <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-6">
      <div class="glass border border-gray-700 p-10 rounded-2xl shadow-2xl max-w-2xl w-full text-center transition-all duration-300 hover:shadow-primary/50">
        <h1 class="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Cloud-Native Gateway</h1>
        <p class="text-gray-300 mb-8 text-lg">Robust RESTful & GraphQL API Gateway</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/graphql" class="block p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition border border-gray-700 hover:border-emerald-400">
            <h3 class="text-xl font-bold text-emerald-400">GraphQL Playground</h3>
            <p class="text-sm text-gray-400 mt-2">Explore the federated graph</p>
          </a>
          <a href="/health" class="block p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition border border-gray-700 hover:border-blue-400">
            <h3 class="text-xl font-bold text-blue-400">Health Check</h3>
            <p class="text-sm text-gray-400 mt-2">View system status</p>
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
});

/**
 * Health check endpoint
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Readiness probe endpoint
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'Ready' });
});

export default router;
