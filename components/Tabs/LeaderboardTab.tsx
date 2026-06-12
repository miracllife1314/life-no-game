'use client';

import React, { useState } from 'react';
import { Profile, Team, Batch } from '@/types';
import { Trophy, Users, Award, Zap, Lock, Unlock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface LeaderboardTabProps {
  profiles: Profile[];
  teams: Team[];
  batches: Batch[];
  currentUser: Profile;
  currentUiRole: string;
  onToggleRankingsVisible?: (batchId: string, visible: boolean) => void;
}

export function LeaderboardTab({
  profiles,
  teams,
  batches,
  currentUser,
  currentUiRole,
  onToggleRankingsVisible
}: LeaderboardTabProps) {
  // Sub-tabs: 'individual' | 'team' | 'hall_individual' | 'hall_team'
  const [subTab, setSubTab] = useState<'individual' | 'team' | 'hall_individual' | 'hall_team'>('individual');

  const now = new Date();

  // Determine which batch is active/selected
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    return currentUser.batch_id || (batches.find(b => b.status === 'active')?.id) || batches[0]?.id || '';
  });

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
  const getTeamDisplayName = (team: Team) => {
    return team.custom_name ? `${team.name} (${team.custom_name})` : team.name;
  };

  const getSubTeamNameOnly = (teamName: string, batchName: string) => {
    if (batchName && teamName.startsWith(batchName)) {
      return teamName.replace(batchName, '').trim();
    }
    return teamName.replace(/NLP.*?期/gi, '').trim() || teamName;
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

  const getBatchName = (batchId?: string | null) => {
    if (!batchId) return '未知期數';
    const batch = batches.find(b => b.id === batchId);
    return batch ? batch.name : '未知期數';
  };

  // Rank badge styles
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 font-black';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-500 text-slate-950 font-black';
      default:
        return 'bg-slate-900 border border-white/10 text-slate-400 light:bg-slate-100 light:border-slate-300';
    }
  };

  // 1. DATA PREPARATION: Current Batch Individual
  const currentBatchProfiles = profiles.filter(p => p.batch_id === selectedBatchId && p.status !== 'inactive');
  const sortedIndividual = [...currentBatchProfiles].sort((a, b) => b.score - a.score);
  const topIndividual = sortedIndividual.slice(0, 3);
  const remainingIndividual = sortedIndividual.slice(3);

  // 2. DATA PREPARATION: Current Batch Team
  const currentBatchTeams = teams.filter(t => t.batch_id === selectedBatchId);
  const enrichedTeams = currentBatchTeams.map(team => {
    const members = currentBatchProfiles.filter(p => p.team_id === team.id);
    const size = members.length || 1;
    const avgScore = Math.round(team.total_score / size);
    const totalLevel = members.reduce((sum, m) => sum + Math.floor(m.score / 500), 0);
    return {
      ...team,
      memberCount: members.length,
      averageScore: avgScore,
      totalLevel
    };
  }).sort((a, b) => b.total_score - a.total_score);
  const topTeams = enrichedTeams.slice(0, 3);
  const remainingTeams = enrichedTeams.slice(3);

  // 3. DATA PREPARATION: All-Time Individual (神人榜) - Limit to top 50
  const sortedAllTimeIndividual = [...profiles]
    .filter(p => p.role !== 'admin' && p.status !== 'inactive') // Exclude GMs and inactive from hall of fame
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  // 4. DATA PREPARATION: All-Time Team (神隊榜) - Limit to top 30
  const enrichedAllTimeTeams = teams.map(team => {
    const members = profiles.filter(p => p.team_id === team.id);
    const totalLevel = members.reduce((sum, m) => sum + Math.floor(m.score / 500), 0);
    return {
      ...team,
      totalLevel
    };
  }).sort((a, b) => b.total_score - a.total_score).slice(0, 30);

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

      {/* Sub-tabs switch (個人榜 / 小隊榜 / 神人榜 / 神隊榜) */}
      <div className="flex flex-wrap bg-slate-900 p-1 rounded-2xl border border-white/5 gap-1 select-none light:bg-slate-100 light:border-slate-300/50">
        <button
          onClick={() => setSubTab('individual')}
          className={`flex-1 min-w-[100px] py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            subTab === 'individual'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
          }`}
        >
          當期個人榜
        </button>
        <button
          onClick={() => setSubTab('team')}
          className={`flex-1 min-w-[100px] py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            subTab === 'team'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
          }`}
        >
          當期小隊榜
        </button>
        <button
          onClick={() => setSubTab('hall_individual')}
          className={`flex-1 min-w-[100px] py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            subTab === 'hall_individual'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
          }`}
        >
          歷屆神人榜
        </button>
        <button
          onClick={() => setSubTab('hall_team')}
          className={`flex-1 min-w-[100px] py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            subTab === 'hall_team'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
          }`}
        >
          歷屆神隊榜
        </button>
      </div>

      {/* ⚠️ HIDE BANNER FOR SPRINT PHASE */}
      {isRankingsLocked && (subTab === 'individual' || subTab === 'team') ? (
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
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Trophy size={18} className="text-yellow-500" />
                {activeBatchName}個人等級排行榜
              </h3>

              {/* 🏆 Podium (個人頒獎台) */}
              {topIndividual.length > 0 && (
                <div className="flex items-end justify-center gap-3 sm:gap-8 pt-10 pb-6 border-b border-white/5 select-none light:border-slate-200">
                  
                  {/* 2nd Place (Silver) */}
                  {topIndividual[1] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="relative">
                        <div className="min-w-[4rem] px-2.5 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 text-slate-950 font-black flex items-center justify-center text-[11px] shadow-[0_0_15px_rgba(203,213,225,0.3)] border border-white/20 select-none text-center">
                          {topIndividual[1].name}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          2
                        </span>
                      </div>
                      <span className="font-black text-white text-xs mt-2 truncate w-20 text-center light:text-slate-900">
                        第二名
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {topIndividual[1].score.toLocaleString()} XP
                      </span>
                      
                      {/* Pedestal with Level inside */}
                      <div className="h-16 w-20 mt-3 rounded-t-xl bg-gradient-to-t from-slate-800/80 to-slate-700/30 border border-slate-700/40 flex flex-col items-center justify-center shadow-lg light:from-slate-200 light:to-slate-100">
                        <span className="text-slate-500 font-extrabold text-xs font-mono">II</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">LV.{Math.floor(topIndividual[1].score / 500)}</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place (Gold) */}
                  {topIndividual[0] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 -mt-4">
                      <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                      <div className="relative">
                        <div className="min-w-[4.5rem] px-3 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-yellow-300/30 select-none text-center">
                          {topIndividual[0].name}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          1
                        </span>
                      </div>
                      <span className="font-black text-amber-200 text-sm mt-2 truncate w-24 text-center light:text-amber-600">
                        第一名
                      </span>
                      <span className="text-[10px] font-bold text-amber-400">
                        {topIndividual[0].score.toLocaleString()} XP
                      </span>
                      
                      {/* Pedestal with Level inside */}
                      <div className="h-24 w-24 mt-3 rounded-t-xl bg-gradient-to-t from-amber-600/80 to-amber-500/30 border border-amber-500/40 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden light:from-amber-100 light:to-amber-50">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                        <span className="text-amber-500/70 font-extrabold text-lg font-mono z-10">I</span>
                        <span className="text-[9px] font-black text-amber-400 mt-0.5 z-10">LV.{Math.floor(topIndividual[0].score / 500)}</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place (Bronze) */}
                  {topIndividual[2] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-3 duration-400">
                      <div className="relative">
                        <div className="min-w-[3.5rem] px-2 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-slate-950 font-black flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-white/20 select-none text-center">
                          {topIndividual[2].name}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-900">
                          3
                        </span>
                      </div>
                      <span className="font-black text-white text-xs mt-2 truncate w-20 text-center light:text-slate-900">
                        第三名
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {topIndividual[2].score.toLocaleString()} XP
                      </span>
                      
                      {/* Pedestal with Level inside */}
                      <div className="h-12 w-20 mt-3 rounded-t-xl bg-gradient-to-t from-orange-900/60 to-orange-850/30 border border-orange-800/40 flex flex-col items-center justify-center shadow-md light:from-orange-100 light:to-orange-50">
                        <span className="text-orange-600/70 font-extrabold text-sm font-mono">III</span>
                        <span className="text-[9px] font-bold text-orange-500 mt-0.5">LV.{Math.floor(topIndividual[2].score / 500)}</span>
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
                  const level = Math.floor(p.score / 500);
                  
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between py-3.5 ${
                        isSelf ? 'bg-amber-500/5 -mx-4 px-4 rounded-xl' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${getRankBadge(rank)}`}>
                          {rank}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-sm flex items-center gap-1.5 light:text-slate-950">
                            {p.name}
                            {isSelf && (
                              <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.25 rounded-md">
                                您
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {getRoleLabel(p.role)} • {getTeamName(p.team_id)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">LV.{level}</span>
                        <div>
                          <span className="font-black text-amber-500 text-sm">
                            {p.score.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold ml-1">經驗</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {subTab === 'team' && (
            /* 👥 當期小隊榜 */
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Users size={18} className="text-yellow-500" />
                {activeBatchName}小隊等級排行榜
              </h3>

              {/* 🏆 Podium (小隊頒獎台) */}
              {topTeams.length > 0 && (
                <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 pb-6 border-b border-white/5 select-none light:border-slate-200">
                  
                  {/* 2nd Place (Silver) */}
                  {topTeams[1] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="relative">
                        <div className="min-w-[4rem] px-2.5 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 font-black flex items-center justify-center text-[11px] shadow-[0_0_15px_rgba(203,213,225,0.3)] border border-white/20 select-none text-center">
                          {getSubTeamNameOnly(topTeams[1].name, activeBatchName)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          2
                        </span>
                      </div>
                      
                      {/* Name of subteam only replaced with place name */}
                      <span className="font-black text-white text-xs mt-2 truncate w-24 text-center light:text-slate-900">
                        第二名
                      </span>
                      
                      {/* Captain & Score details */}
                      <span className="text-[9px] text-slate-500 font-bold">
                        隊長：{profiles.find(p => p.id === topTeams[1].captain_id)?.name || '未指派'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {topTeams[1].total_score.toLocaleString()} XP
                      </span>
                      
                      {/* Pedestal with Team Total Level inside */}
                      <div className="h-16 w-24 mt-3 rounded-t-xl bg-gradient-to-t from-slate-800/80 to-slate-700/30 border border-slate-700/40 flex flex-col items-center justify-center shadow-lg light:from-slate-200 light:to-slate-100">
                        <span className="text-slate-500 font-extrabold text-xs font-mono">II</span>
                        <span className="text-[9px] font-black text-slate-400">總LV.{topTeams[1].totalLevel}</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place (Gold) */}
                  {topTeams[0] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 -mt-4">
                      <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                      <div className="relative">
                        <div className="min-w-[4.5rem] px-3 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-yellow-300/30 select-none text-center">
                          {getSubTeamNameOnly(topTeams[0].name, activeBatchName)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                          1
                        </span>
                      </div>
                      
                      {/* Name of subteam only replaced with place name */}
                      <span className="font-black text-amber-200 text-sm mt-2 truncate w-28 text-center light:text-amber-600">
                        第一名
                      </span>
                      
                      {/* Captain & Score details */}
                      <span className="text-[9px] text-amber-500/70 font-bold">
                        隊長：{profiles.find(p => p.id === topTeams[0].captain_id)?.name || '未指派'}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400">
                        {topTeams[0].total_score.toLocaleString()} XP
                      </span>
                      
                      {/* Pedestal with Team Total Level inside */}
                      <div className="h-24 w-28 mt-3 rounded-t-xl bg-gradient-to-t from-amber-600/80 to-amber-500/30 border border-amber-500/40 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden light:from-amber-100 light:to-amber-50">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                        <span className="text-amber-500/70 font-extrabold text-base font-mono z-10">I</span>
                        <span className="text-[9px] font-black text-amber-400 z-10">總LV.{topTeams[0].totalLevel}</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place (Bronze) */}
                  {topTeams[2] && (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-3 duration-400">
                      <div className="relative">
                        <div className="min-w-[3.5rem] px-2 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-slate-950 font-black flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-white/20 select-none text-center">
                          {getSubTeamNameOnly(topTeams[2].name, activeBatchName)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-900">
                          3
                        </span>
                      </div>
                      
                      {/* Name of subteam only replaced with place name */}
                      <span className="font-black text-white text-xs mt-2 truncate w-24 text-center light:text-slate-900">
                        第三名
                      </span>
                      
                      {/* Captain & Score details */}
                      <span className="text-[9px] text-slate-500 font-bold">
                        隊長：{profiles.find(p => p.id === topTeams[2].captain_id)?.name || '未指派'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {topTeams[2].total_score.toLocaleString()} XP
                      </span>
                      
                      {/* Pedestal with Team Total Level inside */}
                      <div className="h-12 w-24 mt-3 rounded-t-xl bg-gradient-to-t from-orange-900/60 to-orange-850/30 border border-orange-800/40 flex flex-col items-center justify-center shadow-md light:from-orange-100 light:to-orange-50">
                        <span className="text-orange-600/70 font-extrabold text-xs font-mono">III</span>
                        <span className="text-[9px] font-black text-orange-500">總LV.{topTeams[2].totalLevel}</span>
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
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${getRankBadge(rank)}`}>
                          {rank}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="font-black text-white text-sm light:text-slate-950">
                            {getTeamDisplayName(team)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <Award size={10} />
                            <span>隊長：{captain ? captain.name : '（未指定）'} • 隊員：{team.memberCount} 人</span>
                          </span>
                        </div>
                      </div>

                      {/* Scores & Total Level */}
                      <div className="text-right flex items-center gap-4">
                        <div className="text-right select-none">
                          <span className="text-xs font-bold text-slate-400">總LV.{team.totalLevel}</span>
                          <span className="block text-[8px] text-slate-500">小組總等級</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div>
                            <span className="font-black text-amber-500 text-sm">
                              {team.total_score.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold ml-1">總分</span>
                          </div>
                          <div className="flex items-center gap-0.5 text-[9px] text-slate-500 font-mono">
                            <Zap size={9} className="text-amber-500/70" />
                            <span>人均：{team.averageScore.toLocaleString()}</span>
                          </div>
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
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Trophy size={18} className="text-yellow-500 animate-pulse" />
                神人排行榜
              </h3>

              <div className="overflow-x-auto select-none pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200">
                      <th className="p-3 w-12 text-center">排行</th>
                      <th className="p-3">期數</th>
                      <th className="p-3">姓名</th>
                      <th className="p-3 text-center">等級</th>
                      <th className="p-3 text-right">經驗</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {sortedAllTimeIndividual.map((p, idx) => {
                      const rank = idx + 1;
                      const level = Math.floor(p.score / 500);
                      const isSelf = p.id === currentUser.id;

                      return (
                        <tr key={p.id} className={`hover:bg-white/[0.01] light:hover:bg-slate-100/30 ${isSelf ? 'bg-amber-500/5' : ''}`}>
                          <td className="p-3 text-center font-bold">
                            <span className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-[10px] ${
                              rank <= 3 
                                ? 'bg-amber-500 text-slate-950 font-black' 
                                : 'bg-slate-800/40 text-slate-400'
                            }`}>
                              {rank}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-300 light:text-slate-700">{getBatchName(p.batch_id)}</td>
                          <td className="p-3 font-bold text-white light:text-slate-900 flex items-center gap-1">
                            {p.name}
                            {isSelf && <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.2 rounded">您</span>}
                          </td>
                          <td className="p-3 text-center font-bold text-indigo-400">LV.{level}</td>
                          <td className="p-3 text-right font-black text-amber-500 font-mono">{p.score.toLocaleString()} XP</td>
                        </tr>
                      );
                    })}
                    {sortedAllTimeIndividual.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
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
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4 light:text-slate-900">
                <Users size={18} className="text-yellow-500 animate-pulse" />
                神隊排行榜
              </h3>

              <div className="overflow-x-auto select-none pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200">
                      <th className="p-3 w-12 text-center">排行</th>
                      <th className="p-3">期數</th>
                      <th className="p-3">隊名</th>
                      <th className="p-3">小隊長</th>
                      <th className="p-3 text-center">總等級</th>
                      <th className="p-3 text-right">總經驗</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {enrichedAllTimeTeams.map((team, idx) => {
                      const rank = idx + 1;
                      const captainName = profiles.find(p => p.id === team.captain_id)?.name || '未指定';
                      
                      return (
                        <tr key={team.id} className="hover:bg-white/[0.01] light:hover:bg-slate-100/30">
                          <td className="p-3 text-center font-bold">
                            <span className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-[10px] ${
                              rank <= 3 
                                ? 'bg-amber-500 text-slate-950 font-black' 
                                : 'bg-slate-800/40 text-slate-400'
                            }`}>
                              {rank}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-300 light:text-slate-700">{getBatchName(team.batch_id)}</td>
                          <td className="p-3 font-bold text-white light:text-slate-900">{getTeamDisplayName(team)}</td>
                          <td className="p-3 text-slate-400 font-bold">{captainName}</td>
                          <td className="p-3 text-center font-bold text-indigo-400">LV.{team.totalLevel}</td>
                          <td className="p-3 text-right font-black text-amber-500 font-mono">{team.total_score.toLocaleString()} XP</td>
                        </tr>
                      );
                    })}
                    {enrichedAllTimeTeams.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                          目前尚無任何神隊排行。
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
