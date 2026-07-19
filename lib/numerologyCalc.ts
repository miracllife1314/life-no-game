import { NUMBER_MEANINGS, ZERO_MEANING, LIFE_NUMBER_REPORT } from './numerologyData';

export interface BirthInfo {
  birthDigits: string;
  houtian: number;
  chain: number[];
  life: number;
  coreCode: string;
  poolDigits: string;
  birthCounts: Record<number, number>;
  triangleDigits: number[];
  squareDigits: number[];
}

export interface ParseResult {
  ok: boolean;
  error?: string;
  mode?: 'birthday';
  coreCode?: string;
  poolDigits?: string;
  birth?: BirthInfo;
  incompletePool?: boolean;
}

export interface GridCell {
  digit: number;
  circles: number;
  triangle: boolean;
  square: boolean;
}

export interface FiveFortuneDetail {
  label: string;
  emoji: string;
  num: number;
  status: 'core' | 'over' | 'missing' | 'ok';
  block: string;
  lesson: string;
  oneLine: string;
}

export interface PositionDetail {
  label: string;
  digit: number;
  theme: string;
  body: string;
  summary: string;
  hint: string;
}

export interface RepeatDetail {
  digit: number;
  count: number;
  balanced: string;
  excessive: string;
  practice: string;
}

export interface NumerologyReport {
  mode: string;
  incompletePool: boolean;
  birth: BirthInfo | null;
  lifeNumber: number | null;
  lifeReport: any | null;
  coreCode: string;
  coreLen: number;
  nonStandard: boolean;
  fiveFortunes: FiveFortuneDetail[];
  summary: string;
  positions: PositionDetail[];
  grid: { cells: GridCell[]; incomplete: boolean };
  weightRule: string;
  poolComposition: { birth?: string; houtian?: number; life?: number; raw?: string };
  energy: { digit: number; count: number }[];
  missing: { digit: number; need: string }[];
  repeats: RepeatDetail[];
  practice: string[];
  closing: string;
}

const sumDigits = (n: number | string): number =>
  String(n).split('').reduce((a, c) => a + Number(c), 0);

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function deriveFromBirthday(y: number, m: number, d: number): BirthInfo {
  const birthDigits = `${y}${pad2(m)}${pad2(d)}`;
  const houtian = sumDigits(birthDigits);

  const chain = [houtian];
  let n = houtian;
  while (n > 9) {
    n = sumDigits(n);
    chain.push(n);
  }
  const life = chain[chain.length - 1];

  const coreCode = chain.join('');
  const poolDigits = birthDigits + String(houtian) + String(life);

  const birthCounts: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) birthCounts[i] = 0;
  birthDigits.split('').forEach((c) => {
    const x = Number(c);
    if (x >= 1 && x <= 9) birthCounts[x]++;
  });

  // 找出所有中間數的數字
  const middleDigits: number[] = [];
  chain.slice(1, chain.length - 1).forEach((num) => {
    String(num).split('').forEach((c) => {
      const x = Number(c);
      if (x >= 1 && x <= 9) middleDigits.push(x);
    });
  });

  const triangleDigits = String(houtian)
    .split('')
    .map(Number)
    .concat(middleDigits)
    .filter((x) => x >= 1 && x <= 9);

  const squareDigits = [life].filter((x) => x >= 1 && x <= 9);

  return {
    birthDigits,
    houtian,
    chain,
    life,
    coreCode,
    poolDigits,
    birthCounts,
    triangleDigits,
    squareDigits,
  };
}

function positions(len: number): string[] {
  if (len === 1) return ['單一能量'];
  if (len === 2) return ['外在', '內在'];
  if (len === 3) return ['外在', '內在', '發展方向'];
  if (len === 5) return ['外在', '內在', '主要功課', '隱藏功課', '加強位'];
  const L = new Array(len).fill('');
  L[0] = '外在';
  if (len > 1) L[1] = '內在';
  L[len - 1] = '加強/結果位';
  for (let i = 2; i < len - 1; i++) L[i] = '功課' + (i - 1);
  return L;
}

export function parseNumerologyInput(raw: string): ParseResult {
  const cleanRaw = String(raw == null ? '' : raw).trim();
  let y = 0, m = 0, d = 0;
  const mth = cleanRaw.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);
  if (mth) {
    y = Number(mth[1]);
    m = Number(mth[2]);
    d = Number(mth[3]);
  } else if (/^\d{8}$/.test(cleanRaw)) {
    y = Number(cleanRaw.slice(0, 4));
    m = Number(cleanRaw.slice(4, 6));
    d = Number(cleanRaw.slice(6, 8));
  } else {
    return { ok: false, error: '生日格式請用 1987-08-30 或 19870830' };
  }

  if (y < 1900 || y > 2100) return { ok: false, error: '年份請介於 1900–2100' };
  if (m < 1 || m > 12) return { ok: false, error: '月份請介於 1–12' };
  const dim = new Date(y, m, 0).getDate();
  if (d < 1 || d > dim) return { ok: false, error: `該月只有 ${dim} 天` };

  const b = deriveFromBirthday(y, m, d);
  return {
    ok: true,
    mode: 'birthday',
    coreCode: b.coreCode,
    poolDigits: b.poolDigits,
    birth: b,
  };
}

export function analyzeCore(coreCode: string) {
  const digits = String(coreCode).replace(/\D/g, '').split('').map(Number);
  const len = digits.length;
  const counts: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) counts[i] = 0;
  digits.forEach((d) => counts[d]++);
  const repeats = [...new Set(digits)].filter((d) => d >= 1 && d <= 9 && counts[d] >= 2);
  return {
    coreCode: String(coreCode),
    digits,
    len,
    labels: positions(len),
    hasZero: counts[0] > 0,
    nonStandard: ![1, 2, 3, 5].includes(len),
    repeats,
  };
}

export function analyzePool(poolDigits: string) {
  const digits = String(poolDigits).replace(/\D/g, '').split('').map(Number);
  const counts: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) counts[i] = 0;
  digits.forEach((d) => counts[d]++);
  const distinctNonZero = [...new Set(digits)].filter((d) => d >= 1 && d <= 9);
  const repeats = distinctNonZero.filter((d) => counts[d] >= 2);
  const missing = [];
  for (let i = 1; i <= 9; i++) if (counts[i] === 0) missing.push(i);
  return { digits, counts, distinctNonZero, repeats, missing, hasZero: counts[0] > 0 };
}

function balanceHint(count: number): string {
  if (count >= 2) return '（這個數字在你命盤裡偏多，可能比較容易往過度那面，要多留意平衡）';
  if (count === 1) return '（分量算剛好，比較有機會發揮正面的一面）';
  return '';
}

function plainByLabel(label: string, d: number, count: number): string {
  if (d === 0) return '這裡容易空掉、卡住，也會放大前後數字的功課；若能突破，反而是轉折點。';
  const info = NUMBER_MEANINGS[d];
  if (!info) return '';
  const good = info.balanced.slice(0, 3).join('、');
  const over = info.excessive.slice(0, 3).join('、');
  const hint = balanceHint(count);
  switch (label) {
    case '外在':
      return `別人可能看到你「${good}」的一面；若太過，也可能顯得「${over}」。${hint}`;
    case '內在':
      return `內心傾向在意「${info.core}」；平衡時像「${good}」，失衡時可能「${over}」。${hint}`;
    case '發展方向':
      return `方向是把「${good}」活出來；過程要留意別掉進「${over}」。${hint}`;
    case '主要功課':
      return `此生要修「${info.need}」；修得好像「${good}」，卡住時可能「${over}」。${hint}`;
    case '隱藏功課':
      return `隱藏要面對的是「${info.need}」，容易在「${over}」這面卡關。${hint}`;
    case '加強位':
    case '加強/結果位':
      return `「${info.need}」被加強：正向是「${good}」，過度則可能「${over}」。${hint}`;
    case '單一能量':
      return `核心能量在「${good}」，同時也要留意「${over}」。${hint}`;
    default:
      return `要修「${info.need}」。${hint}`;
  }
}

function digitName(d: number): string {
  return d === 0 ? '0（空點）' : `${d}（${NUMBER_MEANINGS[d]?.title || ''}）`;
}

function buildSummary(core: any): string {
  const parts = ['外在是 ' + digitName(core.digits[0])];
  if (core.len >= 2) parts.push('內在是 ' + digitName(core.digits[1]));
  if (core.len >= 5) {
    parts.push('主要功課是 ' + digitName(core.digits[2]));
    parts.push('最後要修成 ' + digitName(core.digits[core.len - 1]));
  } else if (core.len >= 3) {
    parts.push('最後要修成 ' + digitName(core.digits[2]));
  }
  let s = core.coreCode + '：' + parts.join('，');
  if (core.hasZero) s += '；其中的 0 會放大前後數字的功課';
  return s + '。';
}

function buildPractice(core: any, missing: number[], strong: number[]): string[] {
  const b: string[] = [];
  const lessonDigit =
    core.len >= 3 ? core.digits[2] : core.len >= 2 ? core.digits[1] : core.digits[0];
  if (lessonDigit && lessonDigit !== 0) {
    NUMBER_MEANINGS[lessonDigit]?.practice.slice(0, 2).forEach((p) => b.push(p));
  }
  const key = strong[0] || core.digits.find((d: number) => d !== 0);
  if (key && NUMBER_MEANINGS[key]) {
    b.push(
      `避免失衡：別讓「${NUMBER_MEANINGS[key].excessive.join('、')}」蓋過「${NUMBER_MEANINGS[
        key
      ].balanced.join('、')}」`
    );
  }
  if (missing.length) {
    const top = missing
      .slice(0, 3)
      .map((d) => `${d} 的${NUMBER_MEANINGS[d]?.need || ''}`)
      .join('、');
    b.push(`可以慢慢補的能力：${top}`);
  }
  const dir = core.len === 3 ? core.digits[2] : core.digits[core.len - 1];
  if (dir && dir !== 0 && NUMBER_MEANINGS[dir]) {
    b.push(`最後可以成為：${NUMBER_MEANINGS[dir].balanced.join('、')}的人`);
  }
  return b.slice(0, 5);
}

function buildClosing(core: any): string {
  const d1 = core.digits[0],
    d2 = core.digits[1];
  const o = d1 && d1 !== 0 ? NUMBER_MEANINGS[d1]?.balanced.slice(0, 2).join('、') : '有潛力';
  const i = d2 && d2 !== 0 ? '、也很「' + NUMBER_MEANINGS[d2]?.balanced.slice(0, 2).join('、') + '」' : '';
  const lessonDigit = core.len >= 3 ? core.digits[2] : d2;
  const ld = lessonDigit && lessonDigit !== 0 ? NUMBER_MEANINGS[lessonDigit] : null;
  let s = `${core.coreCode} 是一組很「${o}」${i}的數字。你不是沒有能力，只是可能容易在某些地方卡住，或把某個特質放大了。`;
  if (ld) {
    s += `當你願意慢慢${ld.core.replace(/^修/, '')}，把自己的特質正向發揮出來，就有機會從失衡走向平衡。`;
  }
  s += '記得：這些只是傾向，不是命定，每一項都是可以修、可以調整的方向。';
  return s;
}

function buildGrid(parsed: ParseResult) {
  let circleCounts: Record<number, number>;
  let triangleSet: Set<number>;
  let squareSet: Set<number>;
  let incomplete: boolean;

  if (parsed.mode === 'birthday' && parsed.birth) {
    circleCounts = parsed.birth.birthCounts;
    triangleSet = new Set(parsed.birth.triangleDigits);
    squareSet = new Set(parsed.birth.squareDigits);
    incomplete = false;
  } else {
    circleCounts = {};
    for (let i = 1; i <= 9; i++) circleCounts[i] = 0;
    String(parsed.poolDigits)
      .replace(/\D/g, '')
      .split('')
      .forEach((c) => {
        const d = Number(c);
        if (d >= 1 && d <= 9) circleCounts[d]++;
      });
    triangleSet = new Set();
    squareSet = new Set();
    incomplete = true;
  }
  const cells = [];
  for (let d = 1; d <= 9; d++) {
    cells.push({
      digit: d,
      circles: circleCounts[d] || 0,
      triangle: triangleSet.has(d),
      square: squareSet.has(d),
    });
  }
  return { cells, incomplete };
}

function computeWeightedPool(birth: BirthInfo | undefined): Record<number, number> {
  const w: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) w[i] = 0;
  if (!birth) return w;
  for (let d = 1; d <= 9; d++) w[d] += birth.birthCounts[d] || 0;
  birth.triangleDigits.forEach((d) => {
    if (d >= 1 && d <= 9) w[d] += 2;
  });
  birth.squareDigits.forEach((d) => {
    if (d >= 1 && d <= 9) w[d] += 3;
  });
  return w;
}

const FIVE_AREAS = [
  { label: '事業', emoji: '💼', nums: [1, 8, 3] },
  { label: '財富', emoji: '💰', nums: [8, 4] },
  { label: '感情', emoji: '❤️', nums: [6, 2] },
  { label: '家庭', emoji: '🏠', nums: [6, 4] },
  { label: '身體', emoji: '🌿', nums: [5, 7, 9] },
];

function computeFiveFortunes(w: Record<number, number>, lifeNumber: number | null): FiveFortuneDetail[] {
  return FIVE_AREAS.map((a) => {
    const nums = a.nums;
    let pick: number | undefined;
    let status: 'core' | 'over' | 'missing' | 'ok';

    pick = nums.find((n) => n === lifeNumber);
    if (pick != null) {
      status = 'core';
    } else {
      pick = nums.find((n) => w[n] >= 3);
      if (pick != null) {
        status = 'over';
      } else {
        pick = nums.find((n) => w[n] === 0);
        if (pick != null) {
          status = 'missing';
        } else {
          pick = nums[0];
          status = 'ok';
        }
      }
    }

    const info = NUMBER_MEANINGS[pick];
    let block = '';
    let lesson = '';
    if (info) {
      if (status === 'core') {
        block = `這是你主命數的主場，成也在此、卡也在此，用力過頭會「${info.excessive
          .slice(0, 3)
          .join('、')}」`;
        lesson = `把「${info.balanced.slice(0, 3).join('、')}」穩穩活出來`;
      } else if (status === 'over') {
        block = `能量太滿、用力過頭，容易「${info.excessive.slice(0, 3).join('、')}」`;
        lesson = `收斂成「${info.balanced.slice(0, 3).join('、')}」`;
      } else if (status === 'missing') {
        block = `較缺「${info.balanced.slice(0, 2).join('、')}」的能量，容易使不上力`;
        lesson = `慢慢補上 ${info.need}`;
      } else {
        block = `大致平穩，偶爾會「${info.excessive.slice(0, 2).join('、')}」`;
        lesson = `穩定發揮「${info.balanced.slice(0, 2).join('、')}」`;
      }
    }

    return {
      label: a.label,
      emoji: a.emoji,
      num: pick,
      status,
      block,
      lesson,
      oneLine: info?.summary || '',
    };
  });
}

export function generateReport(parsed: ParseResult): NumerologyReport {
  const core = analyzeCore(parsed.coreCode || '');
  const grid = buildGrid(parsed);

  const w = computeWeightedPool(parsed.birth);
  const missing: number[] = [];
  const strong: number[] = [];
  for (let i = 1; i <= 9; i++) {
    if (w[i] === 0) missing.push(i);
    if (w[i] >= 2) strong.push(i);
  }
  strong.sort((a, b) => w[b] - w[a]);

  const lifeNumber = parsed.birth ? parsed.birth.life : null;
  const lifeReport = lifeNumber ? { number: lifeNumber, ...LIFE_NUMBER_REPORT[lifeNumber] } : null;

  return {
    mode: parsed.mode || 'birthday',
    incompletePool: !!parsed.incompletePool,
    birth: parsed.birth || null,
    lifeNumber,
    lifeReport,
    coreCode: core.coreCode,
    coreLen: core.len,
    nonStandard: core.nonStandard,
    fiveFortunes: computeFiveFortunes(w, lifeNumber),
    summary: buildSummary(core),
    positions: core.digits.map((d, i) => {
      const label = core.labels[i];
      const count = w[d] || 0;
      if (d === 0) {
        return {
          label,
          digit: 0,
          theme: ZERO_MEANING.title,
          body: ZERO_MEANING.text,
          summary: '',
          hint: '',
        };
      }
      const info = NUMBER_MEANINGS[d];
      let body = '';
      let summary = '';
      if (info) {
        if (label === '外在') {
          body = info.external;
          summary = info.summary;
        } else if (label === '內在') {
          body = info.internal;
          summary = info.summary;
        } else if (label === '主要功課' || label === '發展方向') {
          body = info.lesson;
          summary = info.summary;
        } else if (label === '單一能量') {
          body = `${info.external} ${info.internal}`;
          summary = info.summary;
        } else {
          body = plainByLabel(label, d, count);
        }
      }
      return {
        label,
        digit: d,
        theme: info?.title || '',
        body,
        summary,
        hint: balanceHint(count),
      };
    }),
    grid,
    weightRule: '圈（生日）×1、三角（後天/中間數）×2、正方形（主命數）×3',
    poolComposition: parsed.birth
      ? { birth: parsed.birth.birthDigits, houtian: parsed.birth.houtian, life: parsed.birth.life }
      : { raw: parsed.poolDigits },
    energy: Array.from({ length: 9 }, (_, i) => ({ digit: i + 1, count: w[i + 1] })),
    missing: missing.map((d) => ({ digit: d, need: NUMBER_MEANINGS[d]?.need || '' })),
    repeats: strong.map((d) => ({
      digit: d,
      count: w[d],
      balanced: NUMBER_MEANINGS[d]?.balanced.join('、') || '',
      excessive: NUMBER_MEANINGS[d]?.excessive.join('、') || '',
      practice: NUMBER_MEANINGS[d]?.practice.join('、') || '',
    })),
    practice: buildPractice(core, missing, strong),
    closing: buildClosing(core),
  };
}
