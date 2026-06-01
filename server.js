import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  callAI,
  parseAIResponse,
  buildMusclePrompt,
  buildExercisePrompt,
  buildInjuryPrompt,
} from './lib/ai.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function makeHandler(promptBuilder, requiredField) {
  return async (req, res) => {
    try {
      const value = req.body[requiredField];
      const valueEn = req.body[`${requiredField}En`];
      if (!value) {
        return res.status(400).json({ error: `${requiredField} required` });
      }
      const content = await callAI(promptBuilder(value, valueEn));
      const result = parseAIResponse(content);
      res.json(result);
    } catch (error) {
      console.error(`${requiredField} query error:`, error);
      res.status(500).json({ error: error.message });
    }
  };
}

app.post('/api/muscle-to-exercises', makeHandler(buildMusclePrompt, 'muscle'));
app.post('/api/exercise-to-muscles', makeHandler(buildExercisePrompt, 'exercise'));
app.post('/api/injury-to-recovery', makeHandler(buildInjuryPrompt, 'injury'));

// Health sync (POST) and read (GET) — delegate to the same handlers Vercel uses.
import('./api/sync-health.js').then(({ default: syncHealth }) => {
  app.post('/api/sync-health', syncHealth);
});
import('./api/health-data.js').then(({ default: healthData }) => {
  app.get('/api/health-data', healthData);
});
import('./api/log-workout.js').then(({ default: logWorkout }) => {
  app.post('/api/log-workout', logWorkout);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: Boolean(process.env.API_KEY),
    model: process.env.MODEL || 'deepseek-chat',
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Model: ${process.env.MODEL || 'deepseek-chat'}`);
  console.log(`✓ API: ${process.env.API_KEY ? 'configured' : '✗ MISSING'}`);
});
