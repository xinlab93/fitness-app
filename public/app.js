// Health panel
async function loadHealthPanel() {
  const meta = document.getElementById('healthPanelMeta');
  const body = document.getElementById('healthPanelBody');
  if (!meta || !body) return;

  try {
    const res = await fetch('/api/health-data');
    const json = await res.json();
    if (!json.configured || !json.data) {
      meta.textContent = '未连接';
      return;
    }
    const data = json.data;
    const synced = data.syncedAt ? new Date(data.syncedAt) : null;
    meta.textContent = synced
      ? `最近同步 ${formatRelativeTime(synced)}`
      : '已配置';

    body.innerHTML = renderHealthData(data);
  } catch (e) {
    meta.textContent = '加载失败';
    console.error(e);
  }
}

function formatRelativeTime(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  return Math.floor(diff / 86400) + ' 天前';
}

function renderHealthData(data) {
  const sections = [];

  if (Array.isArray(data.workouts) && data.workouts.length > 0) {
    const items = data.workouts
      .slice(0, 5)
      .map((w) => {
        const date = (w.start || '').slice(0, 10);
        const dur = w.duration ? `${Math.round(w.duration)}分` : '';
        const cal = w.calories ? `${Math.round(w.calories)}kcal` : '';
        const hr = w.avgHR ? `❤️${Math.round(w.avgHR)}` : '';
        return `<li><span class="hp-date">${date}</span> <span class="hp-type">${w.type || '运动'}</span> <span class="hp-meta">${dur} ${cal} ${hr}</span></li>`;
      })
      .join('');
    sections.push(`<div class="hp-section"><h4>🏋️ 近期训练</h4><ul class="hp-list">${items}</ul></div>`);
  }

  if (Array.isArray(data.hrv) && data.hrv.length > 0) {
    const vals = data.hrv.slice(0, 7).map((h) => Math.round(h.ms || h.value || 0));
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    sections.push(
      `<div class="hp-section"><h4>💓 HRV</h4><div class="hp-stat"><span class="hp-big">${avg}<small>ms</small></span><span class="hp-trend">${vals.join(' / ')}</span></div></div>`
    );
  }

  if (Array.isArray(data.sleep) && data.sleep.length > 0) {
    const items = data.sleep
      .slice(0, 5)
      .map((s) => {
        const date = (s.date || '').slice(5, 10);
        const hrs = (s.hours || 0).toFixed(1);
        return `<li><span class="hp-date">${date}</span> <span class="hp-meta">${hrs} 小时</span></li>`;
      })
      .join('');
    sections.push(`<div class="hp-section"><h4>😴 睡眠</h4><ul class="hp-list">${items}</ul></div>`);
  }

  if (data.metrics) {
    const m = data.metrics;
    const parts = [];
    if (m.weight) parts.push(`<div class="hp-metric"><span class="hp-big">${m.weight}<small>kg</small></span><span class="hp-label">体重</span></div>`);
    if (m.restingHR) parts.push(`<div class="hp-metric"><span class="hp-big">${m.restingHR}<small>bpm</small></span><span class="hp-label">静息心率</span></div>`);
    if (parts.length) sections.push(`<div class="hp-section"><h4>📊 身体指标</h4><div class="hp-metrics">${parts.join('')}</div></div>`);
  }

  if (sections.length === 0) {
    return '<p class="placeholder">数据为空</p>';
  }

  return sections.join('');
}

loadHealthPanel();

// DOM Elements
const exerciseInput = document.getElementById('exerciseInput');
const searchBtn = document.getElementById('searchBtn');
const injuryInput = document.getElementById('injuryInput');
const injurySearchBtn = document.getElementById('injurySearchBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsContainer = document.getElementById('results');
const resultsTitle = document.getElementById('resultsTitle');
const loadingSpinner = document.getElementById('loadingSpinner');
const muscles = document.querySelectorAll('.muscle');
const viewBtns = document.querySelectorAll('.view-btn');
const quickBtns = document.querySelectorAll('.quick-btn:not(.quick-injury)');
const injuryBtns = document.querySelectorAll('.quick-btn.quick-injury');

let currentView = 'front';
let selectedMuscles = new Set();
let highlightedMuscles = new Set();

// View toggle
viewBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    viewBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    document.getElementById('front-view').style.display = currentView === 'front' ? '' : 'none';
    document.getElementById('back-view').style.display = currentView === 'back' ? '' : 'none';
  });
});

// Muscle click handler
muscles.forEach((muscle) => {
  muscle.addEventListener('click', (e) => {
    e.stopPropagation();
    clearHighlights();
    const muscleId = muscle.getAttribute('data-muscle');
    const muscleName = muscle.getAttribute('data-muscle');
    const muscleNameEn = muscle.getAttribute('data-muscle-en');
    queryMuscle(muscleName, muscleNameEn);
  });

  muscle.addEventListener('mouseenter', () => {
    muscle.style.opacity = '1';
  });

  muscle.addEventListener('mouseleave', () => {
    if (!muscle.classList.contains('selected')) {
      muscle.style.opacity = '0.7';
    }
  });
});

// Quick button handlers
quickBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const exercise = btn.dataset.exercise;
    const exerciseEn = btn.dataset['exerciseEn'];
    exerciseInput.value = exercise;
    queryExercise(exercise, exerciseEn);
  });
});

// Search handlers
searchBtn.addEventListener('click', () => {
  const exercise = exerciseInput.value.trim();
  if (exercise) {
    queryExercise(exercise, exercise);
  }
});

exerciseInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// Injury search
injurySearchBtn.addEventListener('click', () => {
  const injury = injuryInput.value.trim();
  if (injury) {
    queryInjury(injury, injury);
  }
});

injuryInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    injurySearchBtn.click();
  }
});

injuryBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const injury = btn.dataset.injury;
    const injuryEn = btn.dataset['injuryEn'];
    injuryInput.value = injury;
    queryInjury(injury, injuryEn);
  });
});

// Clear button
clearBtn.addEventListener('click', () => {
  clearAll();
});

// Document click to clear selection
document.addEventListener('click', (e) => {
  if (!e.target.closest('.muscle') && !e.target.closest('.results-section')) {
    clearSelection();
  }
});

// Query functions
async function queryMuscle(muscle, muscleEn) {
  showLoading();
  try {
    const response = await fetch('/api/muscle-to-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ muscle, muscleEn }),
    });

    const data = await response.json();
    displayMuscleResults(muscle, muscleEn, data);
    highlightMuscles([muscle]);
  } catch (error) {
    showError('查询失败 / Query failed: ' + error.message);
  }
}

async function queryExercise(exercise, exerciseEn) {
  showLoading();
  try {
    const response = await fetch('/api/exercise-to-muscles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise, exerciseEn }),
    });

    const data = await response.json();
    displayExerciseResults(exercise, exerciseEn, data);
    highlightMusclesToTrain(data);
  } catch (error) {
    showError('查询失败 / Query failed: ' + error.message);
  }
}

async function queryInjury(injury, injuryEn) {
  showLoading();
  clearHighlights();
  try {
    const response = await fetch('/api/injury-to-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ injury, injuryEn }),
    });

    const data = await response.json();
    displayInjuryResults(injury, injuryEn, data);
  } catch (error) {
    showError('查询失败 / Query failed: ' + error.message);
  }
}

// Display functions
function createLumbarSummaryCard(impact, mode) {
  if (!impact) return null;

  const levelMap = {
    保护: { cls: 'summary-good', icon: '🛡️', text: '保护腰椎' },
    推荐: { cls: 'summary-good', icon: '✅', text: '推荐参与' },
    中性: { cls: 'summary-neutral', icon: '⚖️', text: '中性影响' },
    谨慎: { cls: 'summary-neutral', icon: '⚠️', text: '谨慎参与' },
    风险: { cls: 'summary-bad', icon: '⛔', text: '注意风险' },
    不推荐: { cls: 'summary-bad', icon: '⛔', text: '不建议' },
  };
  const info = levelMap[impact.level] || levelMap['中性'];

  const card = document.createElement('div');
  card.className = `lumbar-summary ${info.cls}`;

  const titleText = mode === 'muscle'
    ? '🦴 训练此肌肉对腰椎的影响 / Lumbar Impact of Training'
    : '🦴 此运动项目对腰椎的影响 / Lumbar Impact of Sport';

  const adviceLabel = mode === 'muscle' ? '训练原则' : '改良方案';
  const adviceText = impact.recommendations || impact.modifications || '';

  card.innerHTML = `
    <div class="summary-header">
      <span class="summary-title">${titleText}</span>
      <span class="summary-level">${info.icon} ${info.text}</span>
    </div>
    <div class="summary-body">${impact.summary || ''}</div>
    ${adviceText ? `<div class="summary-advice"><strong>${adviceLabel}：</strong>${adviceText}</div>` : ''}
  `;
  return card;
}

function displayMuscleResults(muscle, muscleEn, data) {
  resultsTitle.textContent = `💪 ${muscle} / ${muscleEn}`;
  resultsContainer.innerHTML = '';

  if (!data.exercises || data.exercises.length === 0) {
    resultsContainer.innerHTML = '<div class="placeholder"><p>未找到数据 / No data found</p></div>';
    hideLoading();
    return;
  }

  const summary = createLumbarSummaryCard(data.lumbarImpact, 'muscle');
  if (summary) resultsContainer.appendChild(summary);

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'section-title';
  sectionTitle.textContent = '📋 推荐训练动作 / Recommended Exercises';
  resultsContainer.appendChild(sectionTitle);

  data.exercises.forEach((exercise) => {
    const card = createExerciseCard(exercise);
    resultsContainer.appendChild(card);
  });
  hideLoading();
}

function displayExerciseResults(exercise, exerciseEn, data) {
  resultsTitle.textContent = `🏋️ ${exercise} / ${exerciseEn}`;
  resultsContainer.innerHTML = '';

  if (!data.muscles || data.muscles.length === 0) {
    resultsContainer.innerHTML = '<div class="placeholder"><p>未找到数据 / No data found</p></div>';
    hideLoading();
    return;
  }

  const summary = createLumbarSummaryCard(data.lumbarImpact, 'exercise');
  if (summary) resultsContainer.appendChild(summary);

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'section-title';
  sectionTitle.textContent = '💪 重点训练肌肉 / Target Muscles';
  resultsContainer.appendChild(sectionTitle);

  data.muscles.forEach((muscle) => {
    const card = createMuscleCard(muscle);
    resultsContainer.appendChild(card);
  });
  hideLoading();
}

function spinePressureBadge(level) {
  if (!level) return '';
  const map = {
    高: { cls: 'spine-high', icon: '🔴', text: '高压力' },
    中: { cls: 'spine-mid', icon: '🟡', text: '中压力' },
    低: { cls: 'spine-low', icon: '🟢', text: '低压力' },
  };
  const info = map[level] || map['中'];
  return `<span class="spine-badge ${info.cls}">${info.icon} 腰椎${info.text}</span>`;
}

function displayInjuryResults(injury, injuryEn, data) {
  resultsTitle.textContent = `🩹 ${injury} / ${injuryEn} - 康复方案`;
  resultsContainer.innerHTML = '';

  if (data.injuryOverview) {
    const overview = createInjuryOverview(data.injuryOverview);
    resultsContainer.appendChild(overview);
  }

  if (data.stages && data.stages.length > 0) {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = '📋 分阶段恢复计划 / Recovery Stages';
    resultsContainer.appendChild(sectionTitle);

    data.stages.forEach((stage, idx) => {
      const stageCard = createStageCard(stage, idx);
      resultsContainer.appendChild(stageCard);
    });
  }

  if (data.avoidList && data.avoidList.length > 0) {
    const avoidTitle = document.createElement('div');
    avoidTitle.className = 'section-title section-warning';
    avoidTitle.textContent = '⛔ 禁忌动作 / Avoid';
    resultsContainer.appendChild(avoidTitle);

    const avoidCard = createAvoidCard(data.avoidList);
    resultsContainer.appendChild(avoidCard);
  }

  hideLoading();
}

function createInjuryOverview(overview) {
  const sevMap = {
    轻度: 'summary-good',
    中度: 'summary-neutral',
    重度: 'summary-bad',
  };
  const cls = sevMap[overview.severity] || 'summary-neutral';
  const card = document.createElement('div');
  card.className = `lumbar-summary ${cls}`;
  card.innerHTML = `
    <div class="summary-header">
      <span class="summary-title">🩹 ${overview.name || ''}</span>
      ${overview.severity ? `<span class="summary-level">严重度: ${overview.severity}</span>` : ''}
    </div>
    <div class="summary-body">${overview.summary || ''}</div>
    ${overview.redFlags ? `<div class="summary-advice"><strong>⚠️ 红旗症状（需就医）：</strong>${overview.redFlags}</div>` : ''}
  `;
  return card;
}

function createStageCard(stage, idx) {
  const card = document.createElement('div');
  card.className = 'stage-card';
  const exercisesHtml = (stage.exercises || [])
    .map((ex) => {
      const name = ex.nameEn ? `${ex.name} / ${ex.nameEn}` : ex.name || '';
      const desc = ex.description || '';
      const tips = ex.tips ? `<div class="stage-ex-tips">💡 ${ex.tips}</div>` : '';
      const badge = spinePressureBadge(ex.spinePressure);
      const note = ex.spineNote ? `<div class="spine-note">🦴 ${ex.spineNote}</div>` : '';
      return `
        <div class="stage-exercise">
          <div class="stage-ex-header">
            <span class="stage-ex-name">${name}</span>
            ${badge}
          </div>
          ${desc ? `<div class="stage-ex-desc">${desc}</div>` : ''}
          ${tips}
          ${note}
        </div>
      `;
    })
    .join('');

  card.innerHTML = `
    <div class="stage-header">
      <span class="stage-num">${idx + 1}</span>
      <div class="stage-title-block">
        <div class="stage-phase">${stage.phase || ''}</div>
        ${stage.goal ? `<div class="stage-goal">🎯 ${stage.goal}</div>` : ''}
      </div>
    </div>
    <div class="stage-exercises">${exercisesHtml}</div>
  `;
  return card;
}

function createAvoidCard(avoidList) {
  const card = document.createElement('div');
  card.className = 'avoid-card';
  const items = avoidList
    .map(
      (item) => `
      <li>
        <span class="avoid-name">${item.name || ''}</span>
        ${item.reason ? `<span class="avoid-reason">— ${item.reason}</span>` : ''}
      </li>
    `
    )
    .join('');
  card.innerHTML = `<ul class="avoid-list">${items}</ul>`;
  return card;
}

function createExerciseCard(exercise) {
  const card = document.createElement('div');
  card.className = 'card';
  if (exercise.spinePressure === '高') card.classList.add('card-warning');

  const name = exercise.nameEn ? `${exercise.name} / ${exercise.nameEn}` : exercise.name;
  const description = exercise.description || '';
  const tips = exercise.tips ? `<div class="card-meta">💡 ${exercise.tips}</div>` : '';
  const spineBadge = spinePressureBadge(exercise.spinePressure);
  const spineNote = exercise.spineNote
    ? `<div class="spine-note">🦴 腰椎提示: ${exercise.spineNote}</div>`
    : '';

  card.innerHTML = `
    <div class="card-title">🏋️ ${name}</div>
    <div class="card-badges">${spineBadge}</div>
    <div class="card-description">${description}</div>
    ${spineNote}
    ${tips}
  `;
  return card;
}

function renderRecommendedExercises(exercises) {
  if (!exercises || exercises.length === 0) return '';
  const items = exercises
    .map((ex) => {
      if (typeof ex === 'string') {
        return `<li>${ex}</li>`;
      }
      const name = ex.name || '';
      const badge = spinePressureBadge(ex.spinePressure);
      const note = ex.spineNote ? `<span class="spine-note-inline">— ${ex.spineNote}</span>` : '';
      return `<li>${name} ${badge} ${note}</li>`;
    })
    .join('');
  return `<ul class="exercises-list">${items}</ul>`;
}

function createMuscleCard(muscle) {
  const card = document.createElement('div');
  card.className = 'card';
  const nameZh = muscle.name || '未知肌肉';
  const nameEn = muscle.nameEn ? ` / ${muscle.nameEn}` : '';
  const priority = muscle.priority
    ? `<span class="badge priority-${muscle.priority.toLowerCase()}">${muscle.priority}优先</span>`
    : '';
  const reason = muscle.reason || '';
  const exercisesHtml = renderRecommendedExercises(muscle.exercises);

  card.innerHTML = `
    <div class="card-title">${nameZh}${nameEn} ${priority}</div>
    <div class="card-description">${reason}</div>
    ${exercisesHtml ? `<div class="card-meta">💪 推荐动作 / Recommended:</div>${exercisesHtml}` : ''}
  `;
  return card;
}

// Highlight functions
function muscleMatches(svgMuscleName, queryNames) {
  return queryNames.some(
    (name) => name && (name.includes(svgMuscleName) || svgMuscleName.includes(name))
  );
}

function highlightMuscles(muscleNames) {
  clearHighlights();
  muscles.forEach((muscle) => {
    const muscleData = muscle.getAttribute('data-muscle');
    if (muscleMatches(muscleData, muscleNames)) {
      muscle.classList.add('selected');
      highlightedMuscles.add(muscle);
    }
  });
}

function highlightMusclesToTrain(data) {
  clearHighlights();
  if (!data.muscles || data.muscles.length === 0) return;

  const muscleNames = data.muscles.map((m) => m.name).filter(Boolean);
  const muscleNamesEn = data.muscles.map((m) => m.nameEn).filter(Boolean);

  muscles.forEach((muscle) => {
    const muscleData = muscle.getAttribute('data-muscle');
    const muscleDataEn = muscle.getAttribute('data-muscle-en');
    if (
      muscleMatches(muscleData, muscleNames) ||
      muscleMatches(muscleDataEn, muscleNamesEn)
    ) {
      muscle.classList.add('highlighted');
      highlightedMuscles.add(muscle);
    }
  });
}

function clearHighlights() {
  highlightedMuscles.forEach((muscle) => {
    muscle.classList.remove('selected', 'highlighted');
  });
  highlightedMuscles.clear();
}

// UI functions
function showLoading() {
  loadingSpinner.style.display = 'flex';
  resultsContainer.style.display = 'none';
}

function hideLoading() {
  loadingSpinner.style.display = 'none';
  resultsContainer.style.display = '';
}

function showError(message) {
  hideLoading();
  resultsContainer.innerHTML = `<div class="placeholder"><p>❌ ${message}</p></div>`;
}

function clearSelection() {
  clearHighlights();
}

function clearAll() {
  clearSelection();
  exerciseInput.value = '';
  injuryInput.value = '';
  resultsTitle.textContent = '结果面板 / Results';
  resultsContainer.innerHTML =
    '<div class="placeholder"><p>💪 选择肌肉或搜索运动以获取信息</p><p>📍 Select a muscle or search for an exercise</p></div>';
}
