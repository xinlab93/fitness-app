import { Redis } from '@upstash/redis';
import { setupProxy } from './proxy.js';

const HEALTH_KEY = 'health:latest';

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  setupProxy();
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export async function saveHealth(data) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Upstash not configured (UPSTASH_REDIS_REST_URL/TOKEN missing)');
  }
  const enriched = { ...data, syncedAt: new Date().toISOString() };
  await redis.set(HEALTH_KEY, enriched);
  return enriched;
}

export async function loadHealth() {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(HEALTH_KEY);
  } catch (e) {
    console.error('Health load failed:', e.message);
    return null;
  }
}

export async function appendWorkout(workout) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Upstash not configured');
  }
  const existing = (await redis.get(HEALTH_KEY)) || {};
  const workouts = Array.isArray(existing.workouts) ? [...existing.workouts] : [];

  const startKey = workout.start || workout.startDate;
  const isDuplicate = startKey && workouts.some((w) => (w.start || w.startDate) === startKey);
  if (!isDuplicate) {
    workouts.unshift(workout);
  }

  workouts.sort((a, b) => {
    const sa = a.start || a.startDate || '';
    const sb = b.start || b.startDate || '';
    return sb.localeCompare(sa);
  });
  const trimmed = workouts.slice(0, 30);

  const updated = { ...existing, workouts: trimmed, syncedAt: new Date().toISOString() };
  await redis.set(HEALTH_KEY, updated);
  return { added: !isDuplicate, total: trimmed.length };
}

export function buildHealthContext(health) {
  if (!health) return '';

  const sections = [];
  const syncedAt = health.syncedAt
    ? new Date(health.syncedAt).toLocaleString('zh-CN')
    : null;
  if (syncedAt) sections.push(`同步时间: ${syncedAt}`);

  if (Array.isArray(health.workouts) && health.workouts.length > 0) {
    const recent = health.workouts.slice(0, 8);
    const lines = recent
      .map((w) => {
        const date = w.start ? w.start.slice(0, 10) : '';
        const type = w.type || '运动';
        const dur = w.duration ? `${Math.round(w.duration)}分钟` : '';
        const cal = w.calories ? `${Math.round(w.calories)}kcal` : '';
        const hr = w.avgHR ? `心率${Math.round(w.avgHR)}` : '';
        return `  ${date} ${type} ${dur} ${cal} ${hr}`.trim();
      })
      .join('\n');
    sections.push(`近期训练历史:\n${lines}`);
  }

  if (Array.isArray(health.hrv) && health.hrv.length > 0) {
    const hrvVals = health.hrv.slice(0, 7).map((h) => Math.round(h.ms || h.value || 0));
    const avg = Math.round(hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length);
    sections.push(`HRV(心率变异性): 近7日 ${hrvVals.join('/')}ms，均值${avg}ms`);
  }

  if (Array.isArray(health.sleep) && health.sleep.length > 0) {
    const recent = health.sleep.slice(0, 5);
    const sleepInfo = recent
      .map((s) => `${(s.date || '').slice(5, 10)}:${(s.hours || 0).toFixed(1)}h`)
      .join(' ');
    sections.push(`睡眠: ${sleepInfo}`);
  }

  if (health.metrics) {
    const m = health.metrics;
    const parts = [];
    if (m.weight) parts.push(`体重${m.weight}kg`);
    if (m.restingHR) parts.push(`静息心率${m.restingHR}`);
    if (parts.length) sections.push(`身体指标: ${parts.join('，')}`);
  }

  if (sections.length === 0) return '';
  return `\n\n[用户最新 Apple Watch 健康数据，请在建议中考虑训练频率、恢复状态、强度调整]\n${sections.join('\n')}\n`;
}
