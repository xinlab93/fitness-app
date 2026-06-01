import { loadHealth } from '../lib/storage.js';
import { methodGuard } from '../lib/ai.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  try {
    const health = await loadHealth();
    if (!health) {
      return res.json({ configured: false, data: null });
    }
    res.json({ configured: true, data: health });
  } catch (error) {
    console.error('health-data error:', error);
    res.status(500).json({ error: error.message });
  }
}
