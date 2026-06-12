// =====================================================================
// 資料庫還原工具（把某次備份的資料寫回資料庫）
//
// ⚠️ 這會「覆蓋」資料庫裡同一筆資料，請小心使用。
//
// 用法：
//   1) 先「試跑」（不會更動任何資料，只顯示會還原什麼）：
//        npm run restore -- 2026-06-12_2348
//
//   2) 確認沒問題後，加上 CONFIRM 才會真正寫回：
//        npm run restore -- 2026-06-12_2348 CONFIRM
//
// 說明：
//   - 採「合併還原」(upsert)：把備份裡的每一筆依 id 寫回。
//     → 被刪掉的資料會被「補回來」；被改過的資料會還原成備份當時的內容。
//   - 它「不會刪除」備份之後才新增的資料（只補回與覆蓋，不破壞新資料）。
// =====================================================================

import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !KEY) {
  console.error('❌ 找不到 .env.local 裡的 Supabase 連線資訊。');
  process.exit(1);
}

const folder = process.argv[2];
const confirmed = process.argv[3] === 'CONFIRM';

// 父表先、子表後，降低外鍵順序問題；失敗的會自動重試
const TABLE_ORDER = [
  'batches', 'mission_templates', 'pets', 'pet_lines', 'achievements', 'cards', 'decks',
  'profiles', 'teams', 'tasks', 'missions', 'batch_mission_templates', 'pet_stages',
  'courses', 'announcements', 'captain_candidates', 'squad_roles',
  'submissions', 'score_logs', 'course_attendance', 'user_achievements',
  'user_pets', 'deck_cards', 'user_decks', 'student_notes',
];

function listBackups() {
  if (!fs.existsSync('backups')) return [];
  return fs.readdirSync('backups').filter((f) => fs.statSync(path.join('backups', f)).isDirectory()).sort();
}

if (!folder) {
  console.log('\n請指定要還原的備份資料夾名稱。可用的備份：\n');
  const all = listBackups();
  if (all.length === 0) console.log('  （目前沒有任何備份，請先執行 npm run backup）');
  else all.forEach((f) => console.log(`  ${f}`));
  console.log('\n範例（試跑）：  npm run restore -- ' + (all[all.length - 1] || '備份資料夾名稱') + '\n');
  process.exit(0);
}

const dir = path.join('backups', folder);
if (!fs.existsSync(dir)) {
  console.error(`❌ 找不到備份資料夾：${dir}`);
  console.log('可用的備份：', listBackups().join(', ') || '（無）');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

async function upsert(table, rows) {
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  }
}

// 讀出每張表的資料
const data = {};
for (const table of TABLE_ORDER) {
  const file = path.join(dir, `${table}.json`);
  data[table] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

if (!confirmed) {
  console.log(`\n🔍 試跑模式（不會更動任何資料）— 來源：${dir}\n`);
  let total = 0;
  for (const table of TABLE_ORDER) {
    console.log(`  ${table.padEnd(24)} ${data[table].length} 筆`);
    total += data[table].length;
  }
  console.log(`\n以上共 ${total} 筆「會被寫回」資料庫。`);
  console.log('確認無誤後，請改下這行才會真正還原：');
  console.log(`  npm run restore -- ${folder} CONFIRM\n`);
  process.exit(0);
}

// 真正還原（多輪重試，自動解決外鍵順序問題）
console.log(`\n♻️  開始還原 — 來源：${dir}\n`);
let pending = TABLE_ORDER.filter((t) => data[t].length > 0);
let pass = 0;
const done = [];
while (pending.length > 0 && pass < 4) {
  pass++;
  const stillFailed = [];
  for (const table of pending) {
    try {
      await upsert(table, data[table]);
      done.push(table);
      console.log(`  ✅ ${table.padEnd(24)} ${data[table].length} 筆`);
    } catch (err) {
      stillFailed.push(table);
      if (pass >= 4) console.log(`  ❌ ${table.padEnd(24)} 失敗：${err.message}`);
    }
  }
  pending = stillFailed;
}

console.log(`\n🎉 還原完成！成功寫回 ${done.length} 張表。`);
if (pending.length > 0) {
  console.log(`⚠️  仍有失敗的表：${pending.join(', ')}`);
  console.log('   （可能是外鍵相依或資料衝突，請把上面的紅色訊息貼給我看）');
}
console.log('');
