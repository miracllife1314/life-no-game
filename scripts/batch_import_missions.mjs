import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// 1. 讀取 .env.local 取得 Supabase 憑證
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// 2. 讀取 CSV 檔案
const csvFilePath = path.resolve(process.cwd(), 'scripts', 'missions_data.csv');
if (!fs.existsSync(csvFilePath)) {
  console.error(`找不到 CSV 檔案：${csvFilePath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvFilePath, 'utf8');

// 3. 解析 CSV
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

if (records.length === 0) {
  console.log('CSV 內沒有資料。');
  process.exit(0);
}

// 4. 轉換型別以符合 mission_templates 資料庫
const formattedRecords = records.map(record => ({
  title: record.title,
  description: record.description,
  mission_type: record.mission_type || 'daily', // 'daily', 'weekly', 'special', 'limited'
  points: parseInt(record.points, 10) || 0,
  category: record.category || '',
  max_completions: parseInt(record.max_completions, 10) || 1,
  is_active: true,
  review_type: record.review_type || 'auto'
}));

console.log(`準備匯入 ${formattedRecords.length} 筆任務模板資料...`);

// 5. 匯入到 Supabase mission_templates
async function importMissions() {
  console.log('正在查詢現有的任務模板...');
  const res = await fetch(`${supabaseUrl}/rest/v1/mission_templates?select=title`, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    }
  });

  let existingTitles = [];
  if (res.ok) {
    const data = await res.json();
    existingTitles = data.map(item => item.title);
  } else {
    console.warn('無法獲取現有任務模板，將直接上傳新資料。');
  }

  // 調整同名任務的標題（若重複則加上 " (新)"）
  const recordsToInsert = formattedRecords.map(record => {
    let title = record.title;
    while (existingTitles.includes(title)) {
      title = `${title} (新)`;
    }
    existingTitles.push(title);
    return {
      ...record,
      title
    };
  });

  console.log('正在匯入任務模板...');
  const response = await fetch(`${supabaseUrl}/rest/v1/mission_templates`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recordsToInsert)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('匯入任務模板失敗:', response.status, errorText);
  } else {
    console.log('🎉 任務模板成功匯入，已經出現在你的預設任務模板列表中！');
    console.log('匯入的標題為：', recordsToInsert.map(r => r.title).join(', '));
  }
}

importMissions();
