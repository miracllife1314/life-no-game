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
  missions?: any[];
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

  // 3. Filter members to students and captains in the team, sorting captain first
  const students = allProfiles
    .filter(p => p.team_id === targetTeam.id && (p.role === 'student' || p.role === 'captain') && p.status !== 'inactive')
    .sort((a, b) => {
      if (a.role === 'captain' && b.role !== 'captain') return -1;
      if (a.role !== 'captain' && b.role === 'captain') return 1;
      return 0;
    });

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
      const displayName = m.name + (m.role === 'captain' ? ' (小隊長)' : '');
      return `${index + 1}. ${displayName}${completedDaily ? ' ✅' : ''}`;
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
        const displayName = m.name + (m.role === 'captain' ? ' (小隊長)' : '');
        lines.push(`• ${displayName}：${done.map(t => t.name).join('、')}`);
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
  missions = [],
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
  const [reviewView, setReviewView] = useState<'pending' | 'approved'>('pending'); // 待審核 / 已通過(可退回)
  const [reviewTaskFilter, setReviewTaskFilter] = useState('all'); // 依任務篩選
  const approvedSubmissions = useMemo(
    () => (submissions || []).filter(s => s.status === 'approved'),
    [submissions]
  );
  // 不依賴 join：一律用 id 反查 props，確保學員/任務/經驗/審核者都顯示得出來。
  const profOf = (s: any) => s.profile || profiles.find(p => p.id === s.student_id) || null;
  // 取一筆提交的任務名稱(批次任務查 missions.title,舊任務查 tasks.name)
  const taskNameOfSub = (s: any) =>
    s.mission_id === 'task-custom-post'
      ? '自由分享貼文'
      : (s.mission?.title || missions.find(m => m.id === s.mission_id)?.title
         || tasks.find(t => t.id === s.mission_id)?.name || '（其他／未知任務）');
  // 經驗值:已通過用真實發放的 score_awarded;待審用任務應給的分數
  const scoreOf = (s: any) =>
    s.status === 'approved'
      ? (s.score_awarded ?? 0)
      : (s.mission?.points ?? missions.find(m => m.id === s.mission_id)?.points
         ?? tasks.find(t => t.id === s.mission_id)?.score ?? 0);
  // 審核者:reviewed_by 有值就查姓名;null 代表系統自動通過(免審核任務)
  const reviewerOf = (s: any) =>
    s.reviewed_by ? (profiles.find(p => p.id === s.reviewed_by)?.name || '已審核') : null;
  // 目前檢視下可篩選的「任務」清單(只列實際有的)
  const reviewTaskOptions = useMemo(() => {
    const src = reviewView === 'pending' ? pendingSubmissions : approvedSubmissions;
    const names = new Set<string>();
    src.forEach(s => names.add(taskNameOfSub(s)));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [pendingSubmissions, approvedSubmissions, reviewView, tasks]);

  // 依選取的 batch 過濾小隊選單
  const reviewTeams = useMemo(() => {
    return reviewBatchFilter === 'all'
      ? teams
      : teams.filter(t => t.batch_id === reviewBatchFilter);
  }, [teams, reviewBatchFilter]);

  // 待處理打卡篩選與排序
  const filteredSubmissions = useMemo(() => {
    const source = reviewView === 'pending' ? pendingSubmissions : approvedSubmissions;
    let list = source.filter(sub => {
      const matchBatch = reviewBatchFilter === 'all' || sub.profile?.batch_id === reviewBatchFilter;
      const matchTeam = reviewTeamFilter === 'all' || sub.profile?.team_id === reviewTeamFilter;
      const matchSearch = !reviewSearch || (sub.profile?.name && sub.profile.name.includes(reviewSearch));
      const matchTask = reviewTaskFilter === 'all' || taskNameOfSub(sub) === reviewTaskFilter;
      return matchBatch && matchTeam && matchSearch && matchTask;
    });

    const sorted = [...list].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return reviewSortKey === 'time_asc' ? timeA - timeB : timeB - timeA;
    });
    // 已通過清單可能很大 → 最多顯示 100 筆(請用搜尋/期數縮小範圍)
    return reviewView === 'approved' ? sorted.slice(0, 100) : sorted;
  }, [pendingSubmissions, approvedSubmissions, reviewView, reviewBatchFilter, reviewTeamFilter, reviewSearch, reviewSortKey, reviewTaskFilter]);

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
          <div className="flex flex-col gap-2 shrink-0">
            <h3 className="font-black text-white text-base select-none light:text-slate-900">
              {reviewView === 'pending'
                ? `待處理簽到打卡證明 (${filteredSubmissions.length} / ${pendingSubmissions.length})`
                : `已通過紀錄・可退回 (顯示 ${filteredSubmissions.length} / 共 ${approvedSubmissions.length})`}
            </h3>
            {/* 待審核 / 已通過 切換 */}
            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-white/5 self-start light:bg-slate-200">
              {([['pending', '待審核'], ['approved', '已通過(可退回)']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setReviewView(key); setReviewTaskFilter('all'); }}
                  className={`py-1 px-3 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    reviewView === key
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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

            {/* 篩選任務 */}
            <select
              value={reviewTaskFilter}
              onChange={(e) => setReviewTaskFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 max-w-[180px] light:bg-slate-50 light:border-slate-300 light:text-slate-800"
            >
              <option value="all">所有任務</option>
              {reviewTaskOptions.map(name => (
                <option key={name} value={name}>{name}</option>
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
            {reviewView === 'pending'
              ? '🎉 目前沒有符合篩選條件的待審核證明！'
              : '查無符合條件的已通過紀錄。可用上方「搜尋姓名／期數」縮小範圍。'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(sub => {
              const prof = profOf(sub);
              const reviewer = reviewerOf(sub);
              return (
              <div key={sub.id} className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 light:bg-slate-50 light:border-slate-300/60">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 select-none">
                    <span className="font-bold text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-white/5 light:bg-slate-200 light:text-slate-900 light:border-slate-300">
                      學員：{prof?.name || '（未知學員）'}
                    </span>
                    {(() => {
                      const b = batches.find(bb => bb.id === prof?.batch_id);
                      return b ? (
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded light:text-indigo-700 light:bg-indigo-100 light:border-indigo-300">
                          {b.name}
                        </span>
                      ) : null;
                    })()}
                    {(() => {
                      const tm = teams.find(t => t.id === prof?.team_id);
                      if (!tm) return null;
                      let nm = (tm.custom_name || tm.name || '').trim();
                      const bn = batches.find(bb => bb.id === prof?.batch_id)?.name?.trim();
                      if (bn && nm.startsWith(bn)) { const s = nm.slice(bn.length).trim(); if (s) nm = s; }
                      return (
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded light:text-sky-700 light:bg-sky-100 light:border-sky-300">
                          {nm}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                      任務：{taskNameOfSub(sub)}
                    </span>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      +{scoreOf(sub)} 經驗
                    </span>
                    {/* 審核者:有人審→顯示姓名;免審核任務→系統自動通過 */}
                    {sub.status === 'approved' && (
                      reviewer ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded light:text-emerald-700 light:bg-emerald-100">
                          審核者：{reviewer}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded light:text-slate-600 light:bg-slate-200">
                          系統自動通過(免審核)
                        </span>
                      )
                    )}
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
                      {sub.proof_image_url && String(sub.proof_image_url).split('|').filter(Boolean).map((url: string, i: number, arr: string[]) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-amber-500 hover:underline"
                        >
                          🖼️ 查看佐證圖片{arr.length > 1 ? ` ${i + 1}` : ''}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex gap-2 select-none">
                  {reviewView === 'approved' ? (
                    // 已通過檢視:撤銷通過(退回)→ 觸發器自動扣回分數
                    <button
                      onClick={() => {
                        if (window.confirm(`確定退回「${sub.profile?.name}」這筆已通過的紀錄嗎？\n\n系統會自動扣回先前給的分數(學員、隊伍、神獸經驗一併更新),此筆改為「已退回」。`)) {
                          onReviewSubmission(sub.id, 'rejected');
                        }
                      }}
                      disabled={isSyncing}
                      className="btn-action bg-slate-900 border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 px-3 py-2.5 rounded-xl text-xs font-black flex items-center gap-1 light:bg-slate-100"
                    >
                      <X size={14} />
                      退回(撤銷通過)
                    </button>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              );
            })}
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
