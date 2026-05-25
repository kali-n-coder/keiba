export const HORSES = [
  { id: 'yakisoba', name: 'ヤキソバダッシュ', style: '逃げ', color: '#e4572e', odds: 2.4 },
  { id: 'banana', name: 'チョコバナナ号', style: '先行', color: '#f3b61f', odds: 3.1 },
  { id: 'iincho', name: 'ゼンリョク委員長', style: '差し', color: '#2e86ab', odds: 4.2 },
  { id: 'tshirt', name: 'クラスTシャツ', style: '追込', color: '#4fb286', odds: 5.6 },
  { id: 'tenko', name: '転校生ブースト', style: '気まぐれ', color: '#8f63c7', odds: 7.8 },
  { id: 'haunted', name: 'お化け屋敷ステップ', style: '大穴', color: '#2f2f37', odds: 12.5 }
];

export const DEFAULT_RACE_DURATION_MS = 30_000;

const COMMENTARY = [
  'スタートしました！',
  '第1コーナー、まだ横一線です。',
  '外から勢いよく伸びてきた！',
  '歓声が大きくなっています。',
  '最後の直線、ここから勝負！',
  'ゴール目前、結果はどうなる！'
];

export function createRacePlan({ seed, horses = HORSES, durationMs = DEFAULT_RACE_DURATION_MS }) {
  const random = mulberry32(Number(seed) || 1);
  const runners = horses.map((horse, lane) => {
    const base = durationMs * (0.68 + random() * 0.22);
    const styleBonus = styleFinishModifier(horse.style, random);
    const finishMs = Math.round(clamp(base + styleBonus, durationMs * 0.6, durationMs));
    const surges = Array.from({ length: 4 }, (_, index) => ({
      at: 0.18 + index * 0.18 + random() * 0.08,
      power: 0.02 + random() * 0.045
    }));

    return {
      ...horse,
      lane,
      finishMs,
      surges
    };
  });

  return {
    seed: Number(seed) || 1,
    durationMs,
    commentary: COMMENTARY,
    runners
  };
}

export function getRaceSnapshot({ plan, startTime, now }) {
  const elapsedMs = now - startTime;
  const status = elapsedMs < 0 ? 'waiting' : elapsedMs >= plan.durationMs ? 'finished' : 'running';
  const normalizedElapsed = clamp(elapsedMs, 0, plan.durationMs);
  const runners = plan.runners.map((runner) => {
    const raw = clamp(normalizedElapsed / runner.finishMs, 0, 1);
    const eased = easeOutCubic(raw);
    const surge = raw === 0 ? 0 : runner.surges.reduce((sum, item) => {
      const distance = Math.abs(raw - item.at);
      return sum + Math.max(0, item.power - distance * 0.18);
    }, 0);
    const progress = raw >= 1 ? 1 : clamp(eased * 0.94 + surge, 0, 0.985);

    return {
      ...runner,
      progress: Number(progress.toFixed(4))
    };
  });

  return {
    status,
    elapsedMs: normalizedElapsed,
    runners,
    commentary: plan.commentary[Math.min(plan.commentary.length - 1, Math.floor(normalizedElapsed / 5000))]
  };
}

export function getFinalStandings(plan) {
  return [...plan.runners].sort((a, b) => a.finishMs - b.finishMs || a.id.localeCompare(b.id));
}

export function calculatePayout(stake, horse) {
  const amount = Math.max(0, Number(stake) || 0);
  return Math.floor(amount * Number(horse?.odds || 0));
}

export function makeSeed() {
  return Math.floor(Date.now() + Math.random() * 1_000_000);
}

function styleFinishModifier(style, random) {
  if (style === '逃げ') return -900 + random() * 1800;
  if (style === '追込') return -400 + random() * 2200;
  if (style === '大穴') return -1400 + random() * 4200;
  if (style === '気まぐれ') return -1800 + random() * 3600;
  return -700 + random() * 2000;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
