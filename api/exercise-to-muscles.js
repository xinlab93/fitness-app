import {
  callAI,
  parseAIResponse,
  buildExercisePrompt,
  methodGuard,
} from '../lib/ai.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;

  try {
    const { exercise, exerciseEn } = req.body || {};
    if (!exercise) {
      return res.status(400).json({ error: 'Exercise name required' });
    }

    const content = await callAI(buildExercisePrompt(exercise, exerciseEn));
    const result = parseAIResponse(content);
    res.json(result);
  } catch (error) {
    console.error('Exercise query error:', error);
    res.status(500).json({ error: error.message });
  }
}
