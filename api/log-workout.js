import { appendWorkout } from '../lib/storage.js';
import { methodGuard } from '../lib/ai.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const expected = process.env.SYNC_TOKEN;
  if (!expected) {
    return res.status(500).json({ error: 'SYNC_TOKEN not configured on server' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== expected) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const body = req.body || {};
    if (!body.type && !body.start) {
      return res.status(400).json({ error: 'Missing required fields (type or start)' });
    }
    const result = await appendWorkout(body);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('log-workout error:', error);
    res.status(500).json({ error: error.message });
  }
}
