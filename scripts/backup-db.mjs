// =====================================================================
// 資料庫一鍵備份工具
//
// 用法（在專案資料夾打開終端機，貼上這行）：
//     npm run backup
//
// 會把資料庫所有資料表匯出成 JSON 檔，存到本機 backups/ 資料夾，
// 檔名含日期時間，例如：backups/2026-06-12_2130/profiles.json
// 這些檔案含學員姓名/電話，已設定「不上傳 git」，請自行保管。
// =====================================================================

import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const isProd = process.argv.includes('--prod');
const suffix = isProd ? '' : '_LOCAL';

const SUPABASE_URL = get(`NEXT_PUBLIC_SUPABASE_URL${suffix}`) || get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get(`NEXT_PUBLIC_SUPABASE_ANON_KEY${suffix}`) || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

console.log(`📡 目前使用環境：${isProd ? '🔴 正式區 (PROD)' : '🟢 測試區 (TEST)'}`);
console.log(`📡 連線網址：${SUPABASE_URL}`);

if (!SUPABASE_URL || !KEY) {
  console.error(`❌ 找不到 .env.local 裡的 Supabase 連線資訊 (Suffix: ${suffix})，請確認檔案存在。`);
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const TABLES = [
  'batches', 'mission_templates', 'batch_mission_templates', 'profiles', 'teams',
  'tasks', 'submissions', 'courses', 'course_attendance', 'achievements',
  'user_achievements', 'announcements', 'student_notes', 'score_logs', 'pets',
  'user_pets', 'cards', 'decks', 'deck_cards', 'user_decks', 'missions',
  'pet_lines', 'pet_stages', 'captain_candidates', 'squad_roles',
];

// 以本機時間組出資料夾名稱：YYYY-MM-DD_HHmm
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
const outDir = path.join('backups', stamp);
fs.mkdirSync(outDir, { recursive: true });

// 分頁抓取，確保資料超過 1000 筆也能完整備份
async function fetchAll(table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + pageSize - 1}` },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

console.log(`\n📦 開始備份 → ${outDir}\n`);
let total = 0;
let failed = 0;
for (const table of TABLES) {
  try {
    const rows = await fetchAll(table);
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
    total += rows.length;
    console.log(`  ✅ ${table.padEnd(24)} ${rows.length} 筆`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${table.padEnd(24)} 失敗：${err.message}`);
  }
}

console.log(`\n🎉 備份完成！共 ${total} 筆資料，存於 ${outDir}/`);
if (failed > 0) console.log(`⚠️  有 ${failed} 張表備份失敗，請往上查看紅色訊息。`);
console.log('（這個資料夾在你電腦本機，含個資請妥善保管，不會上傳 git）\n');
