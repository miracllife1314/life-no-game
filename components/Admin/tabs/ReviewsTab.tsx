// =====================================================================
// 後台「審核面板」分頁（待審核打卡證明）—— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState, useEffect, useMemo } from 'react';
import { Check, X, ScrollText, Share2, ChevronDown } from 'lucide-react';
import { Submission, Task, Profile, Team, Batch } from '@/types';
import { nowTaipei, parseTaipei } from '@/lib/time';

interface ReviewsTabProps {
  pendingSubmissions: Submission[];
  tasks: Task[];
  isSyncing: boolean;
  onReviewSubmission: (submissionId: string, status: 'approved' | 'rejected', shareToWitness?: boolean) => Promise<void>;
  profiles?: Profile[];
  teams?: Team[];
  submissions?: Submission[];
  batches?: Batch[];
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const isTodayLocal = (date: Date, now: Date): boolean => {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isTodayInRangeLocal = (start: Date, end: Date, now: Date): boolean => {
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return dNow >= dStart && dNow <= dEnd;
};

const generateRelayText = (
  targetTeam: Team | null,
  allProfiles: Profile[],
  allTasks: Task[],
  allSubmissions: Submission[]
): string => {
  if (!targetTeam) return '';
  const now = nowTaipei();
  
  // Format Date for Title (e.g. 6月19日)
  const month = now.getMonth() + 1;
  const dateNum = now.getDate();
  const dateTitle = `${month}月${dateNum}日`;

  // Filter tasks to match current batch
  const batchTasks = allTasks.filter(t => t.batch_id === targetTeam.batch_id);

  // 1. Get active daily tasks published today
  const todayDailyTasks = batchTasks.filter(t => {
    if (t.type !== 'daily') return false;
    const start = t.start_time || t.publish_time;
    if (!start) return false;
    const startD = parseTaipei(start);
    return isTodayLocal(startD, now);
  });

  // 2. Get active weekly and special (temporary/limited) tasks (whose current time falls between start and end)
  const activeWeeklyOrSpecialTasks = batchTasks.filter(t => {
    if (t.type !== 'weekly' && t.type !== 'temporary' && t.type !== 'limited') return false;
    const start = t.start_time || t.publish_time;
    const end = t.end_time;
    const startD = start ? parseTaipei(start) : null;
    const endD = end ? parseTaipei(end) : null;
    
    // Check range
    if (startD && now.getTime() < startD.getTime()) return false;
    if (endD && now.getTime() > endD.getTime()) return false;
    return true;
  });

  // 3. Filter members to only students in the team
  const students = allProfiles.filter(p => p.team_id === targetTeam.id && p.role === 'student' && p.status !== 'inactive');

  let dailyQuestSection = '';
  let checkinRate = 0;
  let completedCount = 0;

  const weeklyTasks  = activeWeeklyOrSpecialTasks.filter(t => t.type === 'weekly');
  const limitedTasks = activeWeeklyOrSpecialTasks.filter(t => t.type !== 'weekly');

  if (students.length > 0) {
    const dailyLines = students.map((m, index) => {
      const completedDaily = todayDailyTasks.length > 0 && todayDailyTasks.every(t =>
        allSubmissions.some(s => s.student_id === m.id && s.mission_id === t.id && s.status === 'approved')
      );
      if (completedDaily) completedCount++;
      return `${index + 1}. ${m.name}${completedDaily ? ' ✅' : ''}`;
    });
    dailyQuestSection = dailyLines.join('\n');
    checkinRate = Math.round((completedCount / students.length) * 100);
  } else {
    dailyQuestSection = '(目前小隊尚無學員)';
  }

  const buildCompletionSection = (tasks: typeof activeWeeklyOrSpecialTasks) => {
    if (tasks.length === 0) return '（暫無相關任務）';
    const lines: string[] = [];
    students.forEach(m => {
      const done = tasks.filter(t =>
        allSubmissions.some(s => s.student_id === m.id && s.mission_id === t.id && s.status === 'approved')
      );
      if (done.length > 0) {
        lines.push(`• ${m.name}：${done.map(t => t.name).join('、')}`);
      }
    });
    return lines.length > 0 ? lines.join('\n') : '（尚無人完成）';
  };

  const weeklySection  = buildCompletionSection(weeklyTasks);
  const limitedSection = buildCompletionSection(limitedTasks);

  const weeklyBlock  = weeklyTasks.length  > 0 ? `\n\n【每週任務】已完成 ✅\n${weeklySection}`  : '';
  const limitedBlock = limitedTasks.length > 0 ? `\n\n【限時任務】已完成 ✅\n${limitedSection}` : '';

  return `📅 【NLP 定課與修行任務接龍】 ${dateTitle}
──────────────────────
【每日定課】（請在名字後打勾）
${dailyQuestSection}${weeklyBlock}${limitedBlock}
──────────────────────
📊 今日每日打卡率：${checkinRate}% (${completedCount}/${students.length || 1})
💪 同修們，今天也要記得上線完成定課修行唔！`;
};

export function ReviewsTab({
  pendingSubmissions,
  tasks,
  isSyncing,
  onReviewSubmission,
  profiles = [],
  teams = [],
  submissions = [],
  batches = [],
  showToast
}: ReviewsTabProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [relayOpen, setRelayOpen] = useState(false); // 接龍面板預設收起

  // 審核列表的篩選與排序狀態
  const [reviewBatchFilter, setReviewBatchFilter] = useState('all');
  const [reviewTeamFilter, setReviewTeamFilter] = useState('all');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewSortKey, setReviewSortKey] = useState('time_asc'); // 'time_desc' (最新優先), 'time_asc' (最舊優先)

  // 依選取的 batch 過濾小隊選單
  const reviewTeams = useMemo(() => {
    return reviewBatchFilter === 'all'
      ? teams
      : teams.filter(t => t.batch_id === reviewBatchFilter);
  }, [teams, reviewBatchFilter]);

  // 待處理打卡篩選與排序
  const filteredSubmissions = useMemo(() => {
    let list = pendingSubmissions.filter(sub => {
      const matchBatch = reviewBatchFilter === 'all' || sub.profile?.batch_id === reviewBatchFilter;
      const matchTeam = reviewTeamFilter === 'all' || sub.profile?.team_id === reviewTeamFilter;
      const matchSearch = !reviewSearch || (sub.profile?.name && sub.profile.name.includes(reviewSearch));
      return matchBatch && matchTeam && matchSearch;
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return reviewSortKey === 'time_asc' ? timeA - timeB : timeB - timeA;
    });
  }, [pendingSubmissions, reviewBatchFilter, reviewTeamFilter, reviewSearch, reviewSortKey]);

  // Find batches that have teams
  const activeBatches = batches.filter(b => teams.some(t => t.batch_id === b.id));

  // Set default batch and team
  useEffect(() => {
    if (!selectedBatchId && activeBatches.length > 0) {
      setSelectedBatchId(activeBatches[0].id);
    }
  }, [activeBatches, selectedBatchId]);

  useEffect(() => {
    if (selectedBatchId) {
      const cohortTeams = teams.filter(t => t.batch_id === selectedBatchId);
      if (cohortTeams.length > 0 && (!selectedTeamId || !cohortTeams.some(t => t.id === selectedTeamId))) {
        setSelectedTeamId(cohortTeams[0].id);
      }
    } else {
      setSelectedTeamId('');
    }
  }, [selectedBatchId, teams, selectedTeamId]);

  const currentTeam = teams.find(t => t.id === selectedTeamId) || null;
  const relayText = currentTeam ? generateRelayText(currentTeam, profiles, tasks, submissions) : '';

  return (
    <div className="space-y-6">

      {/* 待處理簽到打卡證明 */}
      <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 select-none pb-2 border-b border-white/5 light:border-slate-100">
          <h3 className="font-black text-white text-base select-none light:text-slate-900 shrink-0">
            待處理簽到打卡證明 ({filteredSubmissions.length} / {pendingSubmissions.length})
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* 篩選期數 */}
            <select
              value={reviewBatchFilter}
              onChange={(e) => {
                setReviewBatchFilter(e.target.value);
                setReviewTeamFilter('all');
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
            >
              <option value="all">所有期數</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* 篩選小隊 */}
            <select
              value={reviewTeamFilter}
              onChange={(e) => setReviewTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
            >
              <option value="all">所有小隊</option>
              {reviewTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* 排序方式 */}
            <select
              value={reviewSortKey}
              onChange={(e) => setReviewSortKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 font-bold"
            >
              <option value="time_asc">最舊優先 (依序審核)</option>
              <option value="time_desc">最新優先</option>
            </select>

            {/* 搜尋學員 */}
            <input
              type="text"
              placeholder="搜尋學員姓名..."
              value={reviewSearch}
              onChange={(e) => setReviewSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 flex-1 sm:flex-none sm:w-40"
            />
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-bold text-sm select-none">
            🎉 目前沒有符合篩選條件的待審核證明！
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(sub => (
              <div key={sub.id} className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 light:bg-slate-50 light:border-slate-300/60">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 select-none">
                    <span className="font-bold text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-white/5 light:bg-slate-200 light:text-slate-900 light:border-slate-300">
                      學員：{sub.profile?.name}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                      任務：{sub.mission?.title || tasks.find(t => t.id === sub.mission_id)?.name || '未知任務'}
                    </span>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      +{sub.mission?.points || tasks.find(t => t.id === sub.mission_id)?.score || 0} 經驗
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-bold leading-relaxed">
                    證明描述：「 <span className="text-white italic">{sub.proof_text}</span> 」
                  </p>

                  {(sub.proof_link || sub.proof_image_url) && (
                    <div className="flex flex-wrap gap-3 pt-1.5 select-none">
                      {sub.proof_link && (
                        <a
                          href={sub.proof_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-amber-500 hover:underline"
                        >
                          🔗 查看參考連結
                        </a>
                      )}
                      {sub.proof_image_url && (
                        <a
                          href={sub.proof_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-amber-500 hover:underline"
                        >
                          🖼️ 查看佐證圖片
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions (Approve / Reject) */}
                <div className="shrink-0 flex gap-2 select-none">
                  <button
                    onClick={() => onReviewSubmission(sub.id, 'rejected')}
                    disabled={isSyncing}
                    className="btn-action bg-slate-900 border border-red-500/30 hover:bg-red-500/10 text-red-400 p-2.5 rounded-xl text-xs font-black flex items-center gap-1 light:bg-slate-100"
                  >
                    <X size={14} />
                    退回
                  </button>
                  <button
                    onClick={() => onReviewSubmission(sub.id, 'approved', false)}
                    disabled={isSyncing}
                    className="btn-action bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                  >
                    <Check size={14} />
                    同意加分
                  </button>
                  <button
                    onClick={() => onReviewSubmission(sub.id, 'approved', true)}
                    disabled={isSyncing}
                    title="通過並分享到見證牆"
                    className="btn-action bg-purple-500 hover:bg-purple-600 text-white p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                  >
                    <Check size={14} />
                    上見證牆
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 📋 今日定課與修行任務接龍——預設收起，放在最下方 */}
      {teams.length > 0 && (
        <section className="glass-panel rounded-3xl border border-white/5 light:bg-white light:border-slate-200 overflow-hidden">
          {/* 可點擊的標題列 */}
          <button
            type="button"
            onClick={() => setRelayOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors cursor-pointer select-none"
          >
            <span className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
              <ScrollText size={18} className="text-amber-500" />
              今日定課與修行任務接龍 (LINE 群專用)
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform duration-200 ${relayOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* 展開內容 */}
          {relayOpen && (
            <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4 light:border-slate-200">
              {/* 筛選器 */}
              <div className="flex flex-wrap items-center gap-2 select-none">
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs font-black outline-none cursor-pointer light:bg-slate-100 light:border-slate-300 light:text-slate-900"
                >
                  <option value="">―― 選擇期數 ――</option>
                  {activeBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={!selectedBatchId}
                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs font-black outline-none cursor-pointer light:bg-slate-100 light:border-slate-300 light:text-slate-900 disabled:opacity-50"
                >
                  <option value="">―― 選擇小隊 ――</option>
                  {teams
                    .filter(t => t.batch_id === selectedBatchId)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.custom_name ? `${t.name} (${t.custom_name})` : t.name}</option>
                    ))}
                </select>

                {currentTeam && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(relayText).then(() => {
                        if (showToast) showToast('✓ 接龍文字已複製到剪貼簿！', 'success');
                      });
                    }}
                    className="btn-action bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Share2 size={13} />
                    一鍵複製接龍
                  </button>
                )}
              </div>

              {currentTeam ? (
                <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl light:bg-slate-50 light:border-slate-300/60">
                  <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-text light:text-slate-700">
                    {relayText}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 font-bold text-xs select-none">
                  💡 請在上方選擇期數與小隊以產生接龍文字。
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
