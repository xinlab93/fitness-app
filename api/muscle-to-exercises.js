import {
  callAI,
  parseAIResponse,
  buildMusclePrompt,
  methodGuard,
} from '../lib/ai.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;

  try {
    const { muscle, muscleEn } = req.body || {};
    if (!muscle) {
      return res.status(400).json({ error: 'Muscle name required' });
    }

    const content = await callAI(buildMusclePrompt(muscle, muscleEn));
    const result = parseAIResponse(content);
    res.json(result);
  } catch (error) {
    console.error('Muscle query error:', error);
    res.status(500).json({ error: error.message });
  }
}
