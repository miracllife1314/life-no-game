import fs from 'fs';
import path from 'path';

// 1. 讀取 .env.local 取得 Supabase 憑證
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const isProd = process.argv.includes('--prod');
const suffix = isProd ? '' : '_LOCAL';

const supabaseUrl = env[`NEXT_PUBLIC_SUPABASE_URL${suffix}`] || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env[`NEXT_PUBLIC_SUPABASE_ANON_KEY${suffix}`] || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`📡 匯入課程環境：${isProd ? '🔴 正式區 (PROD)' : '🟢 測試區 (TEST)'}`);
console.log(`📡 連線網址：${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const coursesData = [
  {
    name: '📖 NLP 入門體驗課報名',
    description: '探索大腦使用說明書，開啟潛意識的力量。\n協助你掌握高效溝通與自我轉念的入門鑰匙，踏出自我超越的第一步！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://forms.gle/Uo6VTyLdEvUbqda59'
  },
  {
    name: '📕 NLP 專業執行師・初階課程報名',
    description: '系統化修煉 NLP 核心技術與心法。\n從感官敏銳度、親和感建立到心錨設定，全方位重塑自我行為模式與影響力！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://forms.gle/XP1F9ZE9Y2ueekmX6'
  },
  {
    name: '📕 NLP 初階課程「複訓」報名',
    description: '溫故而知新，針對 NLP 技術實戰力深度磨練。\n再次回到能量場域中，與新老學員共同切磋，讓技術融入本能！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://forms.gle/Qt9Duf1dKANo3NN39'
  },
  {
    name: '📗 NLP 高級執行師・進階課程/複訓報名',
    description: '進階探索信念系統、價值觀與時間線的深層整合。\n學習高級語言模式與催眠語句，成為大師級的溝通者與引導者！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://reurl.cc/94rXYV'
  },
  {
    name: '📒 NLP 大師執行師・高階課程/複訓報名',
    description: '站上系統性思考的高度，重塑身份認同與宏大意圖。\n打通身心靈與核心層面的整合，實現真正的個人卓越與系統轉化！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://forms.gle/ueaGbLCyaLz7rVL36'
  },
  {
    name: '📒 國際 NLP 專業執行師雙證照班報名',
    description: '取得國際權威認證，開啟你的專業教練與諮詢生涯。\n完整嚴謹的認證考核，為您的NLP專業度背書，踏上高價值助人之路！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://forms.gle/D6zVzqPWSQX2mdsB7'
  },
  {
    name: '🧑🏻‍🏫 定洋導師 IG 帳號 @miracllife14',
    description: '追蹤定洋導師的官方自媒體。\n每日獲取實用 NLP 知識、轉念心法與日常啟發，隨時為大腦注入正能量！',
    class_date: new Date().toISOString().substring(0, 10),
    batch_id: null,
    register_url: 'https://www.instagram.com/miracllife14/'
  }
];

async function importCourses() {
  console.log(`準備匯入 ${coursesData.length} 個課程資訊...`);
  
  // 先清理名稱相同的舊資料避免重複
  for (const course of coursesData) {
    await fetch(`${supabaseUrl}/rest/v1/courses?name=eq.${encodeURIComponent(course.name)}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      }
    });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/courses`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(coursesData)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('匯入課程失敗:', response.status, errText);
  } else {
    console.log('🎉 課程連結與導師 IG 資訊成功匯入！已顯示在前台的「課程時間表與資訊中心」！');
  }
}

importCourses();
