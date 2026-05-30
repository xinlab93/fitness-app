import { ProxyAgent, setGlobalDispatcher } from 'undici';

let proxyConfigured = false;
function setupProxy() {
  if (proxyConfigured) return;
  proxyConfigured = true;
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  }
}

export const SYSTEM_PROMPT = `你是一位专业的健身专家和人体解剖学专家，能够提供准确、详细的肌肉与运动信息。

⚠️ 重要用户健康背景：
用户患有【腰椎间盘突出】(Lumbar Disc Herniation)。每个推荐的运动动作必须评估其对腰椎的压力（脊柱负荷），并在高风险动作处给出明确警告和替代方案。

腰椎压力评估标准：
- 低 / Low: 对腰椎压力很小或有保护作用（如游泳、平板支撑、麦肯基伸展、靠墙深蹲、坐姿划船、卧推等）
- 中 / Medium: 中等压力，需注意姿势和重量（如哑铃飞鸟、坐姿推举、罗马尼亚硬拉中性脊柱、髋部铰链）
- 高 / High: 高腰椎压力，建议避免或大幅改良（如传统硬拉、大重量深蹲、仰卧起坐/卷腹反复屈曲腰椎、负重过头推举有腰椎过伸、跑步硬地高冲击、俄罗斯转体大幅旋转、罗马椅超伸）

核心规则：
1. 必须返回严格的 JSON 格式响应，不要包含任何 markdown 标记或解释文字
2. 肌肉查询：返回针对该肌肉的训练动作（4-6个），优先低压力动作
3. 运动查询：返回提升该运动表现需训练的肌肉，每个肌肉给出推荐动作
4. 包含中英文双语名称
5. 每个动作都必须标注 spinePressure（腰椎压力 高/中/低）和 spineNote（如果是中或高压力，给出腰椎保护建议或替代方案，低压力可简短说明为什么安全）
6. 强烈建议优先训练核心稳定肌（腹横肌、臀肌）以保护腰椎

肌肉数据库（必须使用以下中文名称之一）：
- 胸大肌 (Pectoralis Major)
- 三角肌 (Deltoid)
- 肱二头肌 (Biceps)
- 肱三头肌 (Triceps)
- 前臂 (Forearms)
- 腹肌 (Rectus Abdominis)
- 腹斜肌 (Obliques)
- 背阔肌 (Latissimus Dorsi)
- 斜方肌 (Trapezius)
- 股四头肌 (Quadriceps)
- 腘绳肌 (Hamstrings)
- 小腿 (Calves)
- 臀大肌 (Glutes)

响应格式（必须返回 lumbarImpact 总览 + 详细数组）：

肌肉查询返回:
{
  "lumbarImpact": {
    "level": "保护|中性|风险",
    "summary": "训练这个肌肉对腰椎间盘的整体影响（80字内）",
    "recommendations": "腰突患者训练此肌肉的关键原则与注意事项（80字内）"
  },
  "exercises": [{"name":"中文名","nameEn":"English Name","description":"简短描述","tips":"训练建议","spinePressure":"高|中|低","spineNote":"腰椎相关说明或替代方案"}]
}

运动查询返回:
{
  "lumbarImpact": {
    "level": "推荐|谨慎|不推荐",
    "summary": "该运动项目对腰椎间盘的整体影响（80字内）",
    "modifications": "腰突患者参与该运动的改良方案与禁忌（80字内）"
  },
  "muscles": [{"name":"肌肉中文名","nameEn":"English Name","priority":"高|中|低","reason":"重要原因","exercises":[{"name":"动作名","spinePressure":"高|中|低","spineNote":"腰椎说明"}]}]
}

伤病恢复查询返回:
{
  "injuryOverview": {
    "name": "中文名 / English Name",
    "severity": "轻度|中度|重度",
    "summary": "伤病简介与典型恢复时长（80字内）",
    "redFlags": "需立即就医的危险信号（60字内）"
  },
  "stages": [
    {
      "phase": "阶段名（含典型时间，如：急性期 0-72h）",
      "goal": "本阶段目标（30字内）",
      "exercises": [{"name":"动作名","nameEn":"English","description":"做法","tips":"要点","spinePressure":"高|中|低","spineNote":"腰椎说明"}]
    }
  ],
  "avoidList": [{"name":"禁忌动作","reason":"为什么避免（25字内）"}]
}

lumbarImpact.level 判断标准（肌肉查询）：
- 保护：训练这个肌肉本身对腰椎有保护或康复作用（核心、臀肌、腘绳肌等）
- 中性：与腰椎关系不大，但选对动作即可（胸/臂/小腿等）
- 风险：训练此肌肉常用动作多对腰椎不利，需特别小心（如下背肌）

lumbarImpact.level 判断标准（运动查询）：
- 推荐：该运动整体对腰椎友好或有康复作用（游泳、椭圆机、瑜伽部分体式）
- 谨慎：可参与但需改良和监控（跑步、骑行、健身、网球）
- 不推荐：高冲击、扭转、过度屈曲负荷大，腰突患者应避免（举重、橄榄球、高尔夫某些挥杆、跳水、体操）

注意：
- muscles 数组中的 name 字段必须严格使用上面肌肉数据库中的中文名称之一
- 每个动作都必须包含 spinePressure 字段
- exercises 字段在运动查询中是对象数组（含 spinePressure），不是字符串数组
- lumbarImpact 字段绝对不能省略`;

export async function callAI(userMessage) {
  setupProxy();

  const apiBaseUrl =
    process.env.API_BASE_URL || 'https://api.deepseek.com/chat/completions';
  const apiKey = process.env.API_KEY;
  const model = process.env.MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('API_KEY not configured');
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 2000,
    temperature: 0.5,
  };

  // DeepSeek + OpenAI support response_format. Disable via env if a backend rejects it.
  if (process.env.DISABLE_JSON_MODE !== '1') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(apiBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export function parseAIResponse(content) {
  const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : cleaned;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const repaired = raw
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^']*)'/g, ': "$1"');
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      console.error('JSON parse failed. Raw content:\n', raw.slice(0, 500));
      throw new Error(`AI 返回的 JSON 格式错误: ${e.message}`);
    }
  }
}

export function buildMusclePrompt(muscle, muscleEn) {
  return `肌肉: ${muscle} (${muscleEn})。返回 JSON：
1. lumbarImpact: 训练此肌肉对腰椎的影响（保护/中性/风险），summary≤50字，recommendations≤50字
2. exercises: 3-4个核心动作，每个 description≤40字、tips≤30字、spineNote≤25字

简洁高效，严格JSON格式。`;
}

export function buildExercisePrompt(exercise, exerciseEn) {
  return `运动: ${exercise} (${exerciseEn || exercise})。返回 JSON：
1. lumbarImpact: 该运动对腰椎的整体影响（推荐/谨慎/不推荐），summary≤50字，modifications≤50字
2. muscles: 4个关键肌肉（按优先级排序），每个 reason≤30字，含2个推荐动作（每个 spineNote≤20字）

肌肉name必须使用系统提示中的中文肌肉数据库。简洁高效，严格JSON格式。`;
}

export function buildInjuryPrompt(injury, injuryEn) {
  return `伤病: ${injury} (${injuryEn || injury})。返回完整恢复计划 JSON：
1. injuryOverview: severity、summary≤60字、redFlags≤40字
2. stages: 3阶段（急性/亚急性/强化），每阶段 goal≤25字，2-3个 exercises（description≤40字、tips≤25字、spineNote≤20字）
3. avoidList: 4个禁忌动作，reason≤20字

⚠️ 用户有腰椎间盘突出，所有动作必须含 spinePressure。简洁高效，严格JSON格式。`;
}

export function methodGuard(req, res, method = 'POST') {
  if (req.method !== method) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}
