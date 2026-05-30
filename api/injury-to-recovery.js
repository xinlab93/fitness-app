import {
  callAI,
  parseAIResponse,
  buildInjuryPrompt,
  methodGuard,
} from '../lib/ai.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;

  try {
    const { injury, injuryEn } = req.body || {};
    if (!injury) {
      return res.status(400).json({ error: 'Injury name required' });
    }

    const content = await callAI(buildInjuryPrompt(injury, injuryEn));
    const result = parseAIResponse(content);
    res.json(result);
  } catch (error) {
    console.error('Injury query error:', error);
    res.status(500).json({ error: error.message });
  }
}
