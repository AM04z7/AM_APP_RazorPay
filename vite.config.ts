import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAiRequest } from './api/ai';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      {
        name: 'retainops-local-ai-middleware',
        configureServer(server) {
          server.middlewares.use('/api/ai', async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.method !== 'POST') {
              next();
              return;
            }
            // Reload .env / .env.local on every call so user can add ANTHROPIC_API_KEY without restarting Vite
            const env = {
              ...process.env,
              ...loadEnv(mode, process.cwd(), ''),
            };

            let rawBody = '';
            req.on('data', (chunk) => {
              rawBody += chunk;
            });
            req.on('end', async () => {
              try {
                const payload = JSON.parse(rawBody || '{}');
                const result = await handleAiRequest(payload, env, {
                  'x-demo-key': (req.headers['x-demo-key'] as string) || undefined,
                });
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.body));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Local AI proxy error' }));
              }
            });
          });
        },
      },
    ],
  };
});
