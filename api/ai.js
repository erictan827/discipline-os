import { createApiRouter } from '../server/backend.js';

const handler = createApiRouter({
  rootDir: process.cwd(),
  aiProvider: process.env.AI_PROVIDER || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
});

export default async function vercelAI(req, res) {
  const handled = await handler(req, res);
  if (handled) return;
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'NOT_FOUND' }));
}
