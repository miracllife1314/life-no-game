import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epolsiukauqfwxmjojia.supabase.co';
const supabaseKey = 'sb_publishable_ha78KYMdQ0RxD1g6vq6-ug_7vgManxp'; // Using anon key for select
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: logs, error } = await supabase
    .from('score_logs')
    .select('*')
    .eq('reason', '完成任務')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
  } else {
    console.log(logs);
  }
}

main();
