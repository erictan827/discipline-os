import { defineConfig, loadEnv } from 'vite';
import { createApiRouter } from './server/backend.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiRouter = createApiRouter({
    rootDir: process.cwd(),
    aiProvider: env.AI_PROVIDER || process.env.AI_PROVIDER || '',
    openaiApiKey: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    groqApiKey: env.GROQ_API_KEY || process.env.GROQ_API_KEY || '',
  });
  return ({
  plugins: [{
    name: 'local-ai-advisor',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const handled = await apiRouter(req, res);
        if (!handled) next();
      });
    }
  }]
  });
});
