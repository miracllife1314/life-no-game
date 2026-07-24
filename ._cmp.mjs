import pg from 'pg';
const { Client } = pg;
const DBS = {
  lwyn: 'postgresql://postgres.lwynbnphzpmbcawqvycy:O6EHPw4iOH5jkUPJ@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  xeka: 'postgresql://postgres.xekabhkukhjbdgnfddlj:zunga6-pomzuq-xycPod@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
};
const out = {};
for (const [name, conn] of Object.entries(DBS)) {
  const c = new Client({ connectionString: conn }); await c.connect();
  const tbls = (await c.query(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`)).rows.map(r=>r.table_name);
  const counts = {};
  for (const t of ['profiles','tasks','mission_templates','missions','pets','user_pets','submissions','score_logs','life_number_records','batches']) {
    try { counts[t] = (await c.query(`select count(*) from public.${t}`)).rows[0].count; } catch { counts[t]='(無表)'; }
  }
  // 看揚升關鍵設定:任務名 & 寵物名
  let tasknames='', petnames='';
  try { tasknames = (await c.query(`select name from public.tasks order by created_at limit 8`)).rows.map(r=>r.name).join(' / '); } catch {}
  try { petnames = (await c.query(`select name from public.pets order by id limit 8`)).rows.map(r=>r.name).join(' / '); } catch {}
  out[name] = { tblCount: tbls.length, tbls, counts, tasknames, petnames };
}
console.log('=== 表數量 ===');
console.log('  lwyn:', out.lwyn.tblCount, ' xeka:', out.xeka.tblCount);
const onlyXeka = out.xeka.tbls.filter(t=>!out.lwyn.tbls.includes(t));
const onlyLwyn = out.lwyn.tbls.filter(t=>!out.xeka.tbls.includes(t));
console.log('  只在 xeka(lwyn 缺):', onlyXeka.join(', ')||'(無)');
console.log('  只在 lwyn:', onlyLwyn.join(', ')||'(無)');
console.log('\n=== 關鍵表 row 數 (lwyn vs xeka) ===');
for (const t of Object.keys(out.lwyn.counts)) console.log(`  ${t.padEnd(20)} lwyn=${String(out.lwyn.counts[t]).padStart(5)}  xeka=${String(out.xeka.counts[t]).padStart(5)}`);
console.log('\n=== 揚升設定對照 ===');
console.log('  tasks(lwyn):', out.lwyn.tasknames);
console.log('  tasks(xeka):', out.xeka.tasknames);
console.log('  pets (lwyn):', out.lwyn.petnames);
console.log('  pets (xeka):', out.xeka.petnames);
