'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Profile, Team, Batch } from '@/types';
import { Trophy, Users, Award, Zap, Lock, Unlock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { nowTaipei, parseTaipei } from '@/lib/time';
import { calculateLevelFromExp } from '@/lib/levelLogic';
import { supabase } from '@/lib/supabase';
import { formatBrandText } from '@/lib/brand';


interface LeaderboardTabProps {
  profiles: Profile[];
  teams: Team[];
  batches: Batch[];
  submissions?: any[];
  missions?: any[];
  currentUser: Profile;
  currentUiRole: string;
  onToggleRankingsVisible?: (batchId: string, visible: boolean) => void;
}

export function LeaderboardTab({
  profiles,
  teams,
  batches,
  submissions = [],
  missions = [],
  currentUser,
  currentUiRole,
  onToggleRankingsVisible
}: LeaderboardTabProps) {
  // 兩層導覽:範圍(當期/歷屆) × 榜別(神人/神隊/邀約王者/影響力之神)
  const [scope, setScope] = useState<'current' | 'hall'>('current');
  const [rankType, setRankType] = useState<'individual' | 'team' | 'invite' | 'influence'>('individual');

  // 歷屆「邀約王者 / 影響力之神」需跨「所有期數」統計,但學員只載入當期 submissions/missions
  // → 改用伺服器端 RPC(invite_influence_counts)算全部期數,前端歷屆榜直接用它。
  const [allTimeCounts, setAllTimeCounts] = useState<{
    invite: Record<string, number>; influence: Record<string, number>;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.rpc('invite_influence_counts').then(({ data }: any) => {
      if (cancelled || !Array.isArray(data)) return;
      const invite: Record<string, number> = {};
      const influence: Record<string, number> = {};
      for (const r of data) {
        invite[r.student_id] = r.invite_count || 0;
        influence[r.student_id] = r.influence_count || 0;
      }
      setAllTimeCounts({ invite, influence });
    }).catch(() => { /* RPC 未建立時靜默退回前端統計 */ });
    return () => { cancelled = true; };
  }, []);
  // 沿用既有渲染:把(範圍×榜別)映射回原本的 subTab 值(個人/小隊用);邀約/影響力另走新區塊
  const subTab = scope === 'current'
    ? (rankType === 'individual' ? 'individual' : rankType === 'team' ? 'team' : '')
    : (rankType === 'individual' ? 'hall_individual' : rankType === 'team' ? 'hall_team' : '');

  const now = new Date();

  // Determine which batch is active/selected
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    return currentUser.batch_id || (batches.find(b => b.status === 'active')?.id) || batches[0]?.id || '';
  });

  // 從 Header 切換期數時(currentUser 會換成該期帳號),排行榜立即跟著切到該期,
  // 不必重新整理或切到別的分頁再回來。(管理員用下方查詢選單時 currentUser 不變,不受影響)
  useEffect(() => {
    if (currentUser.batch_id) setSelectedBatchId(currentUser.batch_id);
  }, [currentUser.batch_id]);

  const activeBatch = batches.find(b => b.id === selectedBatchId);
  const activeBatchName = activeBatch ? activeBatch.name : '當期';

  // 7 days check (7 * 24 * 60 * 60 * 1000 = 604,800,000 ms)
  const isWithinLast7Days = activeBatch
    ? (new Date(activeBatch.end_date).getTime() - now.getTime()) <= 7 * 86400000
    : false;

  // Rankings visible setting:
  // - If explicitly true: visible.
  // - If explicitly false: locked.
  // - If undefined/null: lock if within 7 days of graduation, else visible.
  const rankingsVisibleSetting = activeBatch?.rankings_visible;

  // Rankings lock status for normal students/captains
  let isRankingsLocked = false;
  if (currentUiRole !== 'admin' && activeBatch) {
    if (rankingsVisibleSetting === false) {
      isRankingsLocked = true;
    } else if (rankingsVisibleSetting === true) {
      isRankingsLocked = false;
    } else {
      isRankingsLocked = isWithinLast7Days;
    }
  }

  // Combined visibility lock flag for students view representation (used in admin UI labels)
  const isLockedForStudents = rankingsVisibleSetting === false || (rankingsVisibleSetting !== true && isWithinLast7Days);

  // Display name helpers
  const getBatchName = (batchId?: string | null) => {
    if (!batchId) return '未知期數';
    const batch = batches.find(b => b.id === batchId);
    return batch ? batch.name : '未知期數';
  };

  // 顯示用:去掉「揚升 / NLP」前綴字樣讓排行榜版面更精簡(僅顯示,不影響配對/排序邏輯;NLP 為相容舊資料)
  const stripNLP = (s: string) => (s || '').replace(/NLP\s*/gi, '').replace(/揚升\s*/g, '').trim();

  const getSubTeamNameOnly = (teamName: string, batchName: string) => {
    if (batchName && teamName.startsWith(batchName)) {
      return teamName.replace(batchName, '').trim();
    }
    return teamName.replace(/(NLP|揚升).*?期/gi, '').trim() || teamName;
  };

  const getTeamDisplayName = (team: Team) => {
    const batchName = getBatchName(team.batch_id);
    const shortName = getSubTeamNameOnly(team.name, batchName);
    return shortName;
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '獨立修行者';
    const team = teams.find(t => t.id === teamId);
    return team ? getTeamDisplayName(team) : '未知小隊';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '大隊長';
      case 'captain': return '小隊長';
      default: return '學員';
    }
  };

  // Rank badge styles
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-600 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.6)] border border-yellow-300/30 scale-110';
      case 2:
        return 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 text-slate-950 font-black shadow-[0_0_8px_rgba(203,213,225,0.4)] border border-slate-200/30 scale-105';
      case 3:
        return 'bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 text-slate-950 font-black shadow-[0_0_8px_rgba(249,115,22,0.4)] border border-orange-400/20';
      default:
        return 'bg-slate-900/60 border border-white/5 text-slate-400 light:bg-slate-100 light:border-slate-300';
    }
  };

  // 🔥 Calculate streaks for all students dynamically using submissions and missions
  const studentStreaks = useMemo(() => {
    const streaks: Record<string, number> = {};
    const dailyIds = new Set(missions.filter((m: any) => m.mission_type === 'daily').map((m: any) => m.id));
    if (dailyIds.size === 0) return streaks;
    const dateOfMission = new Map(missions.map((m: any) => [m.id, m.publish_at]));
    const dayKey = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    const now = nowTaipei();
    
    // Group submissions by student_id to avoid O(N*M) loop
    const submissionsByStudent = new Map<string, any[]>();
    for (const s of submissions) {
      if (s.status === 'rejected') continue;
      if (!dailyIds.has(s.mission_id)) continue;
      const pub = dateOfMission.get(s.mission_id);
      if (!pub) continue;
      
      let list = submissionsByStudent.get(s.student_id);
      if (!list) {
        list = [];
        submissionsByStudent.set(s.student_id, list);
      }
      list.push(s);
    }
    
    // For each profile, calculate its streak
    for (const p of profiles) {
      const pSubmissions = submissionsByStudent.get(p.id) || [];
      const done = new Set<string>();
      for (const s of pSubmissions) {
        const pub = dateOfMission.get(s.mission_id);
        if (!pub) continue;
        done.add(dayKey(parseTaipei(pub)));
      }
      
      const todayKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      const isTodayDone = done.has(todayKey);
      const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (!isTodayDone) cursor.setDate(cursor.getDate() - 1); // today not checked -> start from yesterday
      
      let streak = 0;
      while (done.has(dayKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      if (streak > 0) {
        streaks[p.id] = streak;
      }
    }
    
    return streaks;
  }, [profiles, submissions, missions]);

  // 同分/同均分時的穩定次要排序(避免名次每次 render 隨機互換):較早建立者在前,再退回 id。
  const tieByCreated = (a: any, b: any) =>
    (new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime())
    || String(a?.id || '').localeCompare(String(b?.id || ''));

  // 1. DATA PREPARATION: Current Batch Individual (排除大隊長)
  const currentBatchProfiles = profiles.filter(p => p.batch_id === selectedBatchId && p.status !== 'inactive' && p.role !== 'admin');
  const sortedIndividual = [...currentBatchProfiles].sort((a, b) => (b.score - a.score) || tieByCreated(a, b));
  const topIndividual = sortedIndividual.slice(0, 3);
  const remainingIndividual = sortedIndividual.slice(3);

  // 2. DATA PREPARATION: Current Batch Team
  const currentBatchTeams = teams.filter(t => t.batch_id === selectedBatchId);
  const enrichedTeams = currentBatchTeams.map(team => {
    const members = currentBatchProfiles.filter(p => p.team_id === team.id);
    const size = members.length || 1;
    const avgScore = Math.round(team.total_score / size);
    const totalLevel = members.reduce((sum, m) => sum + calculateLevelFromExp(m.score), 0);
    return {
      ...team,
      memberCount: members.length,
      averageScore: avgScore,
      totalLevel
    };
  }).sort((a, b) => (b.averageScore - a.averageScore) || tieByCreated(a, b));
  const topTeams = enrichedTeams.slice(0, 3);
  const remainingTeams = enrichedTeams.slice(3);

  // 3. DATA PREPARATION: All-Time Individual (神人榜) - Limit to top 50
  const sortedAllTimeIndividual = [...profiles]
    .filter(p => p.role !== 'admin' && p.status !== 'inactive') // Exclude GMs and inactive from hall of fame
    .sort((a, b) => (b.score - a.score) || tieByCreated(a, b))
    .slice(0, 50);

  // 4. DATA PREPARATION: All-Time Team (神隊榜) - Limit to top 30
  const enrichedAllTimeTeams = teams.map(team => {
    const members = profiles.filter(p => p.team_id === team.id);
    const size = members.length || 1;
    const avgScore = Math.round(team.total_score / size);
    const totalLevel = members.reduce((sum, m) => sum + calculateLevelFromExp(m.score), 0);
    return {
      ...team,
      memberCount: members.length,
      averageScore: avgScore,
      totalLevel
    };
  }).sort((a, b) => (b.averageScore - a.averageScore) || tieByCreated(a, b)).slice(0, 30);

  // 5. 邀約王者 / 影響力之神:依「任務名稱關鍵字」數該學員「審核通過」的提交筆數(= 人數)
  //    邀約王者 = 任務名含「邀約」;影響力之神 = 任務名含「推薦」或「成交」
  const inviteMissionIds = new Set(
    (missions as any[]).filter(m => (m.title || '').includes('邀約')).map(m => m.id)
  );
  const influenceMissionIds = new Set(
    (missions as any[]).filter(m => /推薦|成交/.test(m.title || '')).map(m => m.id)
  );
  const inviteCountByStudent: Record<string, number> = {};
  const influenceCountByStudent: Record<string, number> = {};
  for (const s of submissions as any[]) {
    if (s.status !== 'approved') continue;
    if (inviteMissionIds.has(s.mission_id)) {
      inviteCountByStudent[s.student_id] = (inviteCountByStudent[s.student_id] || 0) + 1;
    } else if (influenceMissionIds.has(s.mission_id)) {
      influenceCountByStudent[s.student_id] = (influenceCountByStudent[s.student_id] || 0) + 1;
    }
  }
  // 範圍名單:當期=本期學員;歷屆=全部(皆排除大隊長/停用)
  const scopeProfiles = scope === 'current'
    ? currentBatchProfiles
    : profiles.filter(p => p.role !== 'admin' && p.status !== 'inactive');
  const buildCountRanking = (counts: Record<string, number>) =>
    scopeProfiles
      .map(p => ({ p, count: counts[p.id] || 0 }))
      .filter(x => x.count > 0)
      .sort((a, b) => (b.count - a.count) || tieByCreated(a.p, b.p))
      .slice(0, 50);
  // 歷屆(hall):用 RPC 跨期統計;當期(current):用前端本期統計。RPC 還沒回來時暫退回前端統計。
  const inviteCounts = (scope === 'hall' && allTimeCounts) ? allTimeCounts.invite : inviteCountByStudent;
  const influenceCounts = (scope === 'hall' && allTimeCounts) ? allTimeCounts.influence : influenceCountByStudent;
  const inviteRanking = buildCountRanking(inviteCounts);
  const influenceRanking = buildCountRanking(influenceCounts);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300 select-none text-left">
      
      {/* 👑 Admin controls: select cohort to query & toggle visibility */}
      {currentUiRole === 'admin' && (
        <div className="glass-panel p-4 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-500" />
              <span className="text-xs font-black text-white light:text-slate-800">大隊長後台查詢分頁</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">查詢期數：</span>
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl py-1.5 px-3 outline-none focus:border-red-500 light:bg-slate-50 light:text-slate-950 light:border-slate-300"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(isWithinLast7Days || rankingsVisibleSetting === false) && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs gap-3">
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                {!isLockedForStudents ? <Unlock size={14} /> : <Lock size={14} />}
                <span>
                  {isWithinLast7Days ? "本期已進入結業前 7 天。" : "目前已設定隱藏排行。"}學員端狀態：
                  <strong className={!isLockedForStudents ? "text-green-400" : "text-red-400"}>
                    {!isLockedForStudents ? "手動公開中" : "封印中 (學員不可見)"}
                  </strong>
                </span>
              </span>
              <button
                onClick={() => onToggleRankingsVisible?.(selectedBatchId, isLockedForStudents)}
                className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer text-[10px] flex items-center gap-1 shrink-0 ${
                  !isLockedForStudents 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                }`}
              >
                {!isLockedForStudents ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{!isLockedForStudents ? "手動封印排名" : "手動開啟排名公開"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 第一層:範圍(當期排行榜 / 歷屆排行榜) */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 gap-1 select-none light:bg-slate-100 light:border-slate-300/50">
        {([['current', '當期排行榜'], ['hall', '歷屆排行榜']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setScope(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
              scope === key
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 第二層:榜別(神人榜 / 神隊榜 / 邀約王者 / 影響力之神) */}
      <div className="flex flex-wrap bg-slate-900/60 p-1 rounded-2xl border border-white/5 gap-1 select-none light:bg-slate-100/70 light:border-slate-300/50">
        {([['individual', '神人榜'], ['team', '神隊榜'], ['invite', '邀約王者'], ['influence', '影響力之神']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRankType(key)}
            className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              rankType === key
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ⚠️ HIDE BANNER FOR SPRINT PHASE：當期所有榜都受封印,歷屆不受影響 */}
      {isRankingsLocked && scope === 'current' ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center gap-4 light:bg-white light:border-slate-200 py-16 animate-in zoom-in duration-300">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-2">
            <Lock size={32} />
          </div>
          <h3 className="text-lg font-black text-white light:text-slate-900">排行榜封印中</h3>
          <p className="text-slate-400 light:text-slate-500 text-xs max-w-md leading-relaxed font-black">
            競賽進入倒數隱藏排名等畢業典禮後公告
          </p>
        </div>
      ) : (
        <>
          {subTab === 'individual' && (
            /* 🥇 當期個人榜 */
            <section className="glass-panel px-2.5 py-5 sm:p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Trophy size={18} className="text-yellow-500" />
                {stripNLP(activeBatchName)}個人等級排行榜
              </h3>

              {/* 🏆 Podium (個人頒獎台) */}
              {topIndividual.length > 0 && (
                <div className="flex items-end justify-center gap-3 sm:gap-8 pt-10 pb-6 border-b border-white/5 select-none light:border-slate-200">
                  
                  {/* 2nd Place (Silver) */}
                  {topIndividual[1] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="relative">
                        {currentUser?.id === topIndividual[1].id && (
                          <span className="absolute -top-3 right-0 z-20 text-xs font-black bg-amber-500 text-slate-950 border border-amber-400 px-2 py-0.5 rounded shadow-lg animate-pulse">本人</span>
                        )}
                        <div className="w-[90px] sm:w-28 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 text-slate-950 font-black flex items-center justify-center shadow-[0_0_15px_rgba(203,213,225,0.3)] border border-white/20 select-none text-center">
                          <span className="truncate w-full block text-center px-1 text-sm sm:text-base">{topIndividual[1].name}</span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          2
                        </span>
                        {studentStreaks[topIndividual[1].id] && (
                          <span className="absolute -top-2.5 -left-2 text-[9px] font-extrabold text-orange-400 bg-slate-950/90 border border-orange-500/20 px-1 py-0.5 rounded-md shadow flex items-center gap-0.25 select-none animate-pulse" title={`連續打卡 ${studentStreaks[topIndividual[1].id]} 天`}>
                            🔥{studentStreaks[topIndividual[1].id]}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 mb-1 gap-0.5">
                        <span className="font-black text-white text-xs light:text-slate-900">第二名</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono text-sm font-extrabold text-slate-400 light:text-slate-600">{topIndividual[1].score.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 opacity-80 font-bold tracking-wider">XP</span>
                        </div>
                      </div>
                      
                      {/* Pedestal with Level inside */}
                      <div className="h-16 w-[90px] sm:w-28 mt-2 rounded-t-xl bg-gradient-to-t from-slate-800/80 to-slate-700/30 border border-slate-700/40 flex flex-col items-center justify-center shadow-lg light:from-slate-200 light:to-slate-100">
                        <span className="text-slate-500 font-extrabold text-xs font-mono">II</span>
                        <div className="mt-1 bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded-full shadow-inner flex items-center justify-center light:bg-white light:border-slate-300 light:shadow-sm">
                          <span className="text-xs sm:text-sm font-black text-slate-200 light:text-slate-800 whitespace-nowrap">LV.{calculateLevelFromExp(topIndividual[1].score)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place (Gold) */}
                  {topIndividual[0] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 -mt-4">
                      <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                      <div className="relative">
                        {currentUser?.id === topIndividual[0].id && (
                          <span className="absolute -top-3 right-0 z-20 text-xs font-black bg-white text-amber-600 border border-amber-300 px-2 py-0.5 rounded shadow-lg animate-pulse">本人</span>
                        )}
                        <div className="w-[104px] sm:w-32 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-yellow-300/30 select-none text-center">
                          <span className="truncate w-full block text-center px-1 text-lg sm:text-xl font-black">{topIndividual[0].name}</span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          1
                        </span>
                        {studentStreaks[topIndividual[0].id] && (
                          <span className="absolute -top-2.5 -left-2 text-[9px] font-extrabold text-orange-400 bg-slate-950/90 border border-orange-500/20 px-1 py-0.5 rounded-md shadow flex items-center gap-0.25 select-none animate-pulse" title={`連續打卡 ${studentStreaks[topIndividual[0].id]} 天`}>
                            🔥{studentStreaks[topIndividual[0].id]}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 mb-1 gap-0.5">
                        <span className="font-black text-white text-sm light:text-slate-900">第一名</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono text-base font-black text-slate-400 light:text-slate-600">{topIndividual[0].score.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 opacity-80 font-bold tracking-wider">XP</span>
                        </div>
                      </div>
                      
                      {/* Pedestal with Level inside */}
                      <div className="h-24 w-[104px] sm:w-32 mt-2 rounded-t-xl bg-gradient-to-t from-amber-600/80 to-amber-500/30 border border-amber-500/40 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden light:from-amber-100 light:to-amber-50">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                        <span className="text-amber-500/70 font-extrabold text-lg font-mono z-10">I</span>
                        <div className="mt-1 bg-amber-950 border border-amber-700 px-3.5 py-0.5 rounded-full shadow-inner z-10 flex items-center justify-center light:bg-white light:border-amber-300 light:shadow-sm">
                          <span className="text-sm sm:text-base font-black text-amber-400 light:text-amber-600 whitespace-nowrap">LV.{calculateLevelFromExp(topIndividual[0].score)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place (Bronze) */}
                  {topIndividual[2] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-3 duration-400">
                      <div className="relative">
                        {currentUser?.id === topIndividual[2].id && (
                          <span className="absolute -top-3 right-0 z-20 text-xs font-black bg-amber-500 text-slate-950 border border-amber-400 px-2 py-0.5 rounded shadow-lg animate-pulse">本人</span>
                        )}
                        <div className="w-[90px] sm:w-28 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-slate-950 font-black flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-white/20 select-none text-center">
                          <span className="truncate w-full block text-center px-1 text-sm sm:text-base">{topIndividual[2].name}</span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-900">
                          3
                        </span>
                        {studentStreaks[topIndividual[2].id] && (
                          <span className="absolute -top-2.5 -left-2 text-[9px] font-extrabold text-orange-400 bg-slate-950/90 border border-orange-500/20 px-1 py-0.5 rounded-md shadow flex items-center gap-0.25 select-none animate-pulse" title={`連續打卡 ${studentStreaks[topIndividual[2].id]} 天`}>
                            🔥{studentStreaks[topIndividual[2].id]}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 mb-1 gap-0.5">
                        <span className="font-black text-white text-xs light:text-slate-900">第三名</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono text-sm font-extrabold text-slate-400 light:text-slate-600">{topIndividual[2].score.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 opacity-80 font-bold tracking-wider">XP</span>
                        </div>
                      </div>
                      
                      {/* Pedestal with Level inside */}
                      <div className="h-12 w-[90px] sm:w-28 mt-2 rounded-t-xl bg-gradient-to-t from-orange-900/60 to-orange-850/30 border border-orange-800/40 flex flex-col items-center justify-center shadow-md light:from-orange-100 light:to-orange-50">
                        <span className="text-orange-600/70 font-extrabold text-sm font-mono leading-none mt-1">III</span>
                        <div className="mt-0.5 bg-orange-950 border border-orange-800 px-2.5 py-0.5 rounded-full shadow-inner flex items-center justify-center light:bg-white light:border-orange-300 light:shadow-sm">
                          <span className="text-xs sm:text-sm font-black text-orange-400 light:text-orange-600 whitespace-nowrap">LV.{calculateLevelFromExp(topIndividual[2].score)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Remaining Ranks List */}
              <div className="divide-y divide-white/5 light:divide-slate-200/80 pt-2">
                {remainingIndividual.map((p, idx) => {
                  const rank = idx + 4;
                  const isSelf = p.id === currentUser.id;
                  const level = calculateLevelFromExp(p.score);
                  
                  return (
                    <div
                      key={p.id}
                      className={`grid grid-cols-12 items-center py-3.5 gap-2 ${
                        isSelf ? 'bg-amber-500/5 -mx-4 px-4 rounded-xl' : ''
                      }`}
                    >
                      {/* 左:名次 + 姓名 + 角色·小隊 (col-span-6) */}
                      <div className="col-span-6 flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${getRankBadge(rank)}`}>
                          {rank}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-white text-base sm:text-lg flex items-center flex-wrap gap-1.5 light:text-slate-950">
                            <span className="truncate">{p.name}</span>
                            {isSelf && (
                              <span className="text-[11px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                                本人
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold mt-0.5 select-none truncate">
                            {getRoleLabel(p.role)} • {getTeamName(p.team_id)}
                          </span>
                        </div>
                      </div>

                      {/* 中:經驗 XP(主分數,放中間醒目) col-span-3 */}
                      <div className="col-span-3 text-center leading-tight select-none">
                        <span className="font-black text-amber-500 text-base font-mono whitespace-nowrap">{p.score.toLocaleString()}</span>
                        <span className="block text-[9px] text-slate-500 font-bold tracking-wider">XP</span>
                      </div>

                      {/* 右:等級(上) + 連勝火焰(下);等級顏色統一 indigo col-span-3 */}
                      <div className="col-span-3 flex flex-col items-end gap-1 leading-none select-none">
                        <span className="text-sm font-black text-indigo-400 tracking-wide whitespace-nowrap">LV.{level}</span>
                        {studentStreaks[p.id] && (
                          <span className="text-[10px] font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap leading-none" title={`連續打卡 ${studentStreaks[p.id]} 天`}>
                            🔥 {studentStreaks[p.id]}天
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {subTab === 'team' && (
            /* 👥 當期小隊榜 */
            <section className="glass-panel px-2.5 py-5 sm:p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Users size={18} className="text-yellow-500" />
                {stripNLP(activeBatchName)}小隊等級排行榜
              </h3>

              {/* 🏆 Podium (小隊頒獎台) */}
              {topTeams.length > 0 && (
                <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 pb-6 border-b border-white/5 select-none light:border-slate-200">
                  
                  {/* 2nd Place (Silver) */}
                  {topTeams[1] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="relative">
                        <div className="w-[90px] sm:w-28 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 font-black flex items-center justify-center shadow-[0_0_15px_rgba(203,213,225,0.3)] border border-white/20 select-none text-center">
                          <span className="truncate w-full block text-center px-1 text-sm sm:text-base">
                            {getSubTeamNameOnly(topTeams[1].name, activeBatchName)}
                          </span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          2
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 mb-1 gap-0.5">
                        <span className="font-black text-white text-xs light:text-slate-900">第二名</span>
                        <span className="text-[9px] text-slate-400 light:text-slate-500 font-bold whitespace-nowrap">
                          隊長: {profiles.find(p => p.id === topTeams[1].captain_id)?.name || '未指派'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs font-black text-slate-400 light:text-slate-600">{topTeams[1].averageScore.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 font-bold">人均</span>
                        </div>
                        <span className="text-[9px] text-slate-400 light:text-slate-500 font-bold whitespace-nowrap">
                          總 {topTeams[1].total_score.toLocaleString()} XP
                        </span>
                      </div>
                      
                      {/* Pedestal with Team Total Level inside */}
                      <div className="h-16 w-[90px] sm:w-28 mt-2 rounded-t-xl bg-gradient-to-t from-slate-800/80 to-slate-700/30 border border-slate-700/40 flex flex-col items-center justify-center shadow-lg light:from-slate-200 light:to-slate-100">
                        <span className="text-slate-500 font-extrabold text-xs font-mono">II</span>
                        <div className="mt-1 bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded-full shadow-inner flex items-center justify-center light:bg-white light:border-slate-300 light:shadow-sm">
                          <span className="text-xs sm:text-sm font-black text-slate-200 light:text-slate-800 whitespace-nowrap">LV.{topTeams[1].totalLevel}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place (Gold) */}
                  {topTeams[0] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 -mt-4">
                      <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                      <div className="relative">
                        <div className="w-[104px] sm:w-32 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-yellow-300/30 select-none text-center">
                          <span className="truncate w-full block text-center px-1 text-lg sm:text-xl font-black">
                            {getSubTeamNameOnly(topTeams[0].name, activeBatchName)}
                          </span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          1
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 mb-1 gap-0.5">
                        <span className="font-black text-white text-sm light:text-slate-900">第一名</span>
                        <span className="text-[9px] text-amber-500/70 font-bold whitespace-nowrap">
                          隊長: {profiles.find(p => p.id === topTeams[0].captain_id)?.name || '未指派'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-sm font-black text-slate-400 light:text-slate-600">{topTeams[0].averageScore.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-bold">人均</span>
                        </div>
                        <span className="text-[9px] text-amber-400/80 light:text-slate-500 font-bold whitespace-nowrap">
                          總 {topTeams[0].total_score.toLocaleString()} XP
                        </span>
                      </div>
                      
                      {/* Pedestal with Team Total Level inside */}
                      <div className="h-24 w-[104px] sm:w-32 mt-2 rounded-t-xl bg-gradient-to-t from-amber-600/80 to-amber-500/30 border border-amber-500/40 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden light:from-amber-100 light:to-amber-50">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                        <span className="text-amber-500/70 font-extrabold text-lg font-mono z-10">I</span>
                        <div className="mt-1 bg-amber-950 border border-amber-700 px-3.5 py-0.5 rounded-full shadow-inner z-10 flex items-center justify-center light:bg-white light:border-amber-300 light:shadow-sm">
                          <span className="text-sm sm:text-base font-black text-amber-400 light:text-amber-600 whitespace-nowrap">LV.{topTeams[0].totalLevel}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place (Bronze) */}
                  {topTeams[2] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-3 duration-400">
                      <div className="relative">
                        <div className="w-[90px] sm:w-28 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-slate-950 font-black flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-white/20 select-none text-center">
                          <span className="truncate w-full block text-center px-1 text-sm sm:text-base">
                            {getSubTeamNameOnly(topTeams[2].name, activeBatchName)}
                          </span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-900">
                          3
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 mb-1 gap-0.5">
                        <span className="font-black text-white text-xs light:text-slate-900">第三名</span>
                        <span className="text-[9px] text-slate-400 light:text-slate-500 font-bold whitespace-nowrap">
                          隊長: {profiles.find(p => p.id === topTeams[2].captain_id)?.name || '未指派'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs font-black text-slate-400 light:text-slate-600">{topTeams[2].averageScore.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 font-bold">人均</span>
                        </div>
                        <span className="text-[9px] text-slate-400 light:text-slate-500 font-bold whitespace-nowrap">
                          總 {topTeams[2].total_score.toLocaleString()} XP
                        </span>
                      </div>
                      
                      {/* Pedestal with Team Total Level inside */}
                      <div className="h-12 w-[90px] sm:w-28 mt-2 rounded-t-xl bg-gradient-to-t from-orange-900/60 to-orange-850/30 border border-orange-800/40 flex flex-col items-center justify-center shadow-md light:from-orange-100 light:to-orange-50">
                        <span className="text-orange-600/70 font-extrabold text-sm font-mono leading-none mt-1">III</span>
                        <div className="mt-0.5 bg-orange-950 border border-orange-800 px-2.5 py-0.5 rounded-full shadow-inner flex items-center justify-center light:bg-white light:border-orange-300 light:shadow-sm">
                          <span className="text-xs sm:text-sm font-black text-orange-400 light:text-orange-600 whitespace-nowrap">LV.{topTeams[2].totalLevel}</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Remaining Teams List */}
              <div className="divide-y divide-white/5 light:divide-slate-200/80 pt-2">
                {remainingTeams.map((team, idx) => {
                  const rank = idx + 4;
                  const captain = profiles.find(p => p.id === team.captain_id);
                  
                  return (
                    <div
                      key={team.id}
                      className="grid grid-cols-12 items-center py-4 gap-2"
                    >
                      {/* Left: Rank & Team Name (col-span-6) */}
                      <div className="col-span-6 flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${getRankBadge(rank)}`}>
                          {rank}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-white text-base sm:text-lg light:text-slate-950">
                            {getTeamDisplayName(team)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5 select-none truncate">
                            <Award size={10} className="shrink-0" />
                            <span className="truncate">隊長：{captain ? captain.name : '（未指定）'} • 隊員：{team.memberCount} 人</span>
                          </span>
                        </div>
                      </div>

                      {/* Middle: Total Level (col-span-3 text-center) */}
                      <div className="col-span-3 text-center">
                        <span className="text-base sm:text-lg font-black text-slate-300 light:text-slate-800 tracking-wide">LV.{team.totalLevel}</span>
                        <span className="block text-[8px] text-slate-500 select-none">小組總等級</span>
                      </div>

                      {/* Right: Scores (col-span-3 text-right) */}
                      <div className="col-span-3 text-right flex flex-col items-end min-w-0">
                        <div className="truncate">
                          <span className="font-black text-amber-500 text-sm font-mono">
                            {team.averageScore.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1 select-none">人均</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold mt-0.5 select-none truncate">
                          總 {team.total_score.toLocaleString()} XP
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {subTab === 'hall_individual' && (
            /* 🏆 歷屆神人榜 */
            <section className="glass-panel px-2.5 py-5 sm:p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Trophy size={18} className="text-yellow-500 animate-pulse" />
                神人排行榜
              </h3>

              <div className="overflow-x-auto select-none pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200">
                      <th className="px-1.5 py-3 w-9 text-center">排行</th>
                      <th className="px-1.5 py-3">期數 / 連勝</th>
                      <th className="px-1.5 py-3">等級 / 姓名</th>
                      <th className="px-1.5 py-3 text-right">經驗</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {sortedAllTimeIndividual.map((p, idx) => {
                      const rank = idx + 1;
                      const level = calculateLevelFromExp(p.score);
                      const isSelf = p.id === currentUser.id;

                      return (
                        <tr 
                          key={p.id} 
                          className={`transition-all ${
                            isSelf 
                              ? 'bg-amber-500/10 border-l-2 border-l-amber-500' 
                              : rank === 1 
                                ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500/50'
                                : rank === 2 
                                  ? 'bg-slate-300/5 border-l-2 border-l-slate-400/50'
                                  : rank === 3 
                                    ? 'bg-orange-400/5 border-l-2 border-l-orange-500/50'
                                    : 'hover:bg-white/[0.01] light:hover:bg-slate-100/30'
                          }`}
                        >
                          <td className="p-3 text-center font-bold">
                            {rank === 1 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">🥇</span>
                            ) : rank === 2 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(203,213,225,0.5)]">🥈</span>
                            ) : rank === 3 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">🥉</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-center text-[10px] ${getRankBadge(rank)}`}>
                                {rank}
                              </span>
                            )}
                          </td>
                          {/* 期數(上) / 連勝火焰(下) */}
                          <td className="px-1.5 py-3">
                            <div className="flex flex-col gap-1 leading-tight items-start select-none">
                              <span className="text-[10px] font-bold text-slate-400 light:text-slate-500 whitespace-nowrap">{stripNLP(getBatchName(p.batch_id))}</span>
                              {studentStreaks[p.id] ? (
                                <span className="text-[10px] font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 whitespace-nowrap leading-none" title={`連續打卡 ${studentStreaks[p.id]} 天`}>
                                  🔥 {studentStreaks[p.id]}天
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 light:text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          {/* 等級(上) / 姓名(下) */}
                          <td className="px-1.5 py-3">
                            <div className="flex flex-col gap-0.5 leading-tight select-none">
                              <span className="text-sm font-black text-indigo-400 light:text-indigo-600 whitespace-nowrap">LV.{level}</span>
                              <span className="text-base sm:text-lg font-black text-white light:text-slate-900 flex items-center flex-wrap gap-1.5">
                                <span>{p.name}</span>
                                {isSelf && <span className="text-[10px] sm:text-xs font-black bg-amber-500 text-slate-950 border border-amber-400 px-2 py-0.5 rounded-md shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)] mt-0.5">本人</span>}
                              </span>
                            </div>
                          </td>
                          {/* 經驗 */}
                          <td className="px-1.5 py-3 text-right">
                            <div className="flex flex-col items-end leading-tight select-none">
                              <span className="font-black text-amber-500 font-mono text-sm whitespace-nowrap">{p.score.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-500 font-bold mt-0.5">XP</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedAllTimeIndividual.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">
                          目前尚無任何神人排行。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {subTab === 'hall_team' && (
            /* 🏆 歷屆神隊榜 */
            <section className="glass-panel px-2.5 py-5 sm:p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Users size={18} className="text-yellow-500 animate-pulse" />
                神隊排行榜
              </h3>

              <div className="overflow-x-auto select-none pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200">
                      <th className="px-1.5 py-3 w-9 text-center">排行</th>
                      <th className="px-1.5 py-3">期數 / 隊名</th>
                      <th className="px-1.5 py-3">等級 / 隊長</th>
                      <th className="px-1.5 py-3 text-right">人均 / 總分</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {enrichedAllTimeTeams.map((team, idx) => {
                      const rank = idx + 1;
                      const captainName = profiles.find(p => p.id === team.captain_id)?.name || '未指定';
                      
                      return (
                        <tr 
                          key={team.id} 
                          className={`transition-all ${
                            rank === 1 
                              ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500/50'
                              : rank === 2 
                                ? 'bg-slate-300/5 border-l-2 border-l-slate-400/50'
                                : rank === 3 
                                  ? 'bg-orange-400/5 border-l-2 border-l-orange-500/50'
                                  : 'hover:bg-white/[0.01] light:hover:bg-slate-100/30'
                          }`}
                        >
                          <td className="p-3 text-center font-bold">
                            {rank === 1 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">🥇</span>
                            ) : rank === 2 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(203,213,225,0.5)]">🥈</span>
                            ) : rank === 3 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">🥉</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-center text-[10px] ${getRankBadge(rank)}`}>
                                {rank}
                              </span>
                            )}
                          </td>
                          {/* 期數(上) / 隊名(下) */}
                          <td className="px-1.5 py-3">
                            <div className="flex flex-col gap-0.5 leading-tight">
                              <span className="text-[10px] font-bold text-slate-400 light:text-slate-500 whitespace-nowrap">{stripNLP(getBatchName(team.batch_id))}</span>
                              <span className="text-base sm:text-lg font-black text-white light:text-slate-900 break-words">{getSubTeamNameOnly(team.name, getBatchName(team.batch_id))}</span>
                            </div>
                          </td>
                          {/* 總等級(上) / 小隊長(下) */}
                          <td className="px-1.5 py-3">
                            <div className="flex flex-col gap-0.5 leading-tight select-none">
                              <span className="text-base sm:text-lg font-black text-indigo-400 light:text-indigo-600 whitespace-nowrap">總LV.{team.totalLevel}</span>
                              <span className="text-base sm:text-lg font-bold text-slate-300 light:text-slate-600 break-words">{captainName}</span>
                            </div>
                          </td>
                          {/* 人均(上) / 總分(下) */}
                          <td className="px-1.5 py-3 text-right">
                            <div className="flex flex-col items-end leading-tight select-none">
                              <span className="font-black text-amber-500 font-mono text-sm whitespace-nowrap">{team.averageScore.toLocaleString()}</span>
                              <span className="font-bold text-slate-400 light:text-slate-500 font-mono text-sm whitespace-nowrap mt-0.5">總 {team.total_score.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {enrichedAllTimeTeams.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">
                          目前尚無任何神隊排行。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(rankType === 'invite' || rankType === 'influence') && (
            /* 🤝 邀約王者 / ✨ 影響力之神:依任務名稱關鍵字數「審核通過」筆數 */
            <section className="glass-panel px-2.5 py-5 sm:p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-1 light:text-slate-900">
                {rankType === 'invite'
                  ? <><Users size={18} className="text-emerald-400" /> 邀約王者</>
                  : <><Zap size={18} className="text-purple-400" /> 影響力之神</>}
              </h3>
              <p className="text-center text-[10px] font-bold text-slate-500 -mt-1">
                {formatBrandText(rankType === 'invite' ? '邀約入門課人數排名' : '推薦報名初階人數排名')}（{scope === 'current' ? stripNLP(activeBatchName) : '歷屆'}）
              </p>
              <div className="overflow-x-auto select-none pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200">
                      <th className="p-3 w-12 text-center">排行</th>
                      <th className="p-3">期數</th>
                      <th className="p-3">姓名</th>
                      <th className="p-3 text-right">{rankType === 'invite' ? '邀約人數' : '推薦人數'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {(rankType === 'invite' ? inviteRanking : influenceRanking).map((x, idx) => {
                      const rank = idx + 1;
                      const isSelf = x.p.id === currentUser.id;
                      return (
                        <tr 
                          key={x.p.id} 
                          className={`transition-all ${
                            isSelf 
                              ? 'bg-amber-500/10 border-l-2 border-l-amber-500' 
                              : rank === 1 
                                ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500/50'
                                : rank === 2 
                                  ? 'bg-slate-300/5 border-l-2 border-l-slate-400/50'
                                  : rank === 3 
                                    ? 'bg-orange-400/5 border-l-2 border-l-orange-500/50'
                                    : 'hover:bg-white/[0.01] light:hover:bg-slate-100/30'
                          }`}
                        >
                          <td className="p-3 text-center font-bold">
                            {rank === 1 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">🥇</span>
                            ) : rank === 2 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(203,213,225,0.5)]">🥈</span>
                            ) : rank === 3 ? (
                              <span className="text-base filter drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]">🥉</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-center text-[10px] ${getRankBadge(rank)}`}>
                                {rank}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-300 light:text-slate-700 whitespace-nowrap">{stripNLP(getBatchName(x.p.batch_id))}</td>
                          <td className="p-3 font-bold text-white light:text-slate-900 flex items-center gap-1">
                            {x.p.name}
                            {isSelf && <span className="text-xs font-black bg-amber-500 text-slate-950 border border-amber-400 px-2 py-0.5 rounded-md shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]">本人</span>}
                          </td>
                          <td className="p-3 text-right font-black text-amber-500 font-mono">{x.count} 人</td>
                        </tr>
                      );
                    })}
                    {(rankType === 'invite' ? inviteRanking : influenceRanking).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">
                          目前尚無{rankType === 'invite' ? '邀約' : '推薦'}紀錄。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
