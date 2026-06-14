// =====================================================================
// 環境防呆檢查工具
//
// 用法：node scripts/check-env.mjs
// =====================================================================

import fs from 'fs';

try {
  if (!fs.existsSync('.env.local')) {
    console.log('\n❌ 找不到 .env.local 檔案！請確認環境變數設定。');
    process.exit(1);
  }

  const env = fs.readFileSync('.env.local', 'utf8');
  const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
  const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');

  if (!SUPABASE_URL) {
    console.log('\n❌ 找不到 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL！');
    process.exit(1);
  }

  // 正式資料庫的專案 ID (從 URL 擷取)
  const PROD_PROJECT_ID = 'epolsiukauqfwxmjojia'; 
  const currentProjectId = SUPABASE_URL.replace('https://', '').split('.')[0];

  console.log('\n==================================================');
  console.log('🔍 正在進行資料庫連線防呆檢查...');
  console.log(`📡 目前連線 URL: ${SUPABASE_URL}`);
  
  if (currentProjectId === PROD_PROJECT_ID) {
    console.log('\n🚨🚨🚨 【極度警告：目前連線為 正式生產區 】 🚨🚨🚨');
    console.log('⚠️  您此時的任何操作（如資料庫備份/還原/測試）都將直接寫入「真實學員」的資料！');
    console.log('📌 請勿在此狀態下執行任何清空（truncate/delete）或測試用的資料寫入腳本。');
  } else {
    console.log('\n🟢🟢🟢 【安全提示：目前連線為 測試開發區 】 🟢🟢🟢');
    console.log('✅ 這是您的測試沙盒，您可以放心在此進行任何功能優化與測試，不會影響線上學員！');
  }
  console.log('==================================================\n');
} catch (err) {
  console.error('檢查過程中發生錯誤：', err.message);
}
