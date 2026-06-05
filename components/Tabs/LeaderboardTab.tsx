'use client';

import React, { useState } from 'react';
import { Profile, Team } from '@/types';
import { Trophy, Users, Award, Zap } from 'lucide-react';

interface LeaderboardTabProps {
  profiles: Profile[];
  teams: Team[];
  currentUserId: string;
}

export function LeaderboardTab({ profiles, teams, currentUserId }: LeaderboardTabProps) {
  const [subTab, setSubTab] = useState<'individual' | 'team'>('individual');

  // 1. Sort profiles by score DESC for individual board
  const sortedProfiles = [...profiles].sort((a, b) => b.score - a.score);
  const topProfiles = sortedProfiles.slice(0, 3);
  const remainingProfiles = sortedProfiles.slice(3);

  const getTeamDisplayName = (team: Team) => {
    return team.custom_name ? `${team.name} (${team.custom_name})` : team.name;
  };

  // Helper to find team details for profiles
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '獨立修行者';
    const team = teams.find(t => t.id === teamId);
    return team ? getTeamDisplayName(team) : '未知小隊';
  };

  // Helper to find profile role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '大隊長';
      case 'captain': return '小隊長';
      default: return '學員';
    }
  };

  // 2. Sort teams by total_score / average_score for team board
  // Calculate average scores and sizes to show
  const enrichedTeams = teams.map(team => {
    const members = profiles.filter(p => p.team_id === team.id);
    const size = members.length || 1;
    const avgScore = Math.round(team.total_score / size);
    return {
      ...team,
      memberCount: members.length,
      averageScore: avgScore
    };
  }).sort((a, b) => b.total_score - a.total_score);
  const topTeams = enrichedTeams.slice(0, 3);
  const remainingTeams = enrichedTeams.slice(3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500 text-slate-950 font-black';
      case 2:
        return 'bg-slate-300 text-slate-950 font-black';
      case 3:
        return 'bg-orange-400 text-slate-950 font-black';
      default:
        return 'bg-slate-900 border border-white/10 text-slate-400 light:bg-slate-100 light:border-slate-300';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300 select-none">
      
      {/* Sub-tabs switch (個人榜 / 小隊榜) */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 w-64 mx-auto light:bg-slate-100 light:border-slate-300/50">
        <button
          onClick={() => setSubTab('individual')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'individual'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
          }`}
        >
          <Trophy size={14} />
          個人榜
        </button>
        <button
          onClick={() => setSubTab('team')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'team'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          小隊榜
        </button>
      </div>

      {subTab === 'individual' ? (
        /* 🥇 個人修為榜 */
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4">
            <Trophy size={18} className="text-yellow-500" />
            個人修為排行榜
          </h3>

          {/* 🏆 Podium (個人頒獎台) */}
          {topProfiles.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-8 pt-10 pb-6 border-b border-white/5 select-none light:border-slate-200">
              
              {/* 2nd Place (Silver) */}
              {topProfiles[1] && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-[0_0_15px_rgba(203,213,225,0.3)] border border-white/20">
                      {topProfiles[1].name.substring(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                      2
                    </span>
                  </div>
                  <span className="font-black text-white text-xs mt-2 truncate w-20 text-center light:text-slate-900">
                    {topProfiles[1].name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {topProfiles[1].score.toLocaleString()} XP
                  </span>
                  
                  {/* Pedestal */}
                  <div className="h-16 w-20 mt-3 rounded-t-xl bg-gradient-to-t from-slate-800/80 to-slate-700/30 border border-slate-700/40 flex items-center justify-center shadow-lg light:from-slate-200 light:to-slate-100">
                    <span className="text-slate-500 font-extrabold text-xl font-mono">II</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold) */}
              {topProfiles[0] && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 -mt-4">
                  <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-yellow-300/30">
                      {topProfiles[0].name.substring(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                      1
                    </span>
                  </div>
                  <span className="font-black text-amber-200 text-sm mt-2 truncate w-24 text-center light:text-amber-600">
                    {topProfiles[0].name}
                  </span>
                  <span className="text-[10px] font-bold text-amber-400">
                    {topProfiles[0].score.toLocaleString()} XP
                  </span>
                  
                  {/* Pedestal */}
                  <div className="h-24 w-24 mt-3 rounded-t-xl bg-gradient-to-t from-amber-600/80 to-amber-500/30 border border-amber-500/40 flex items-center justify-center shadow-2xl relative overflow-hidden light:from-amber-100 light:to-amber-50">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                    <span className="text-amber-500/70 font-extrabold text-2xl font-mono">I</span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {topProfiles[2] && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-slate-950 font-black flex items-center justify-center text-base shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-white/20">
                      {topProfiles[2].name.substring(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-900">
                      3
                    </span>
                  </div>
                  <span className="font-black text-white text-xs mt-2 truncate w-20 text-center light:text-slate-900">
                    {topProfiles[2].name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {topProfiles[2].score.toLocaleString()} XP
                  </span>
                  
                  {/* Pedestal */}
                  <div className="h-12 w-20 mt-3 rounded-t-xl bg-gradient-to-t from-orange-900/60 to-orange-850/30 border border-orange-800/40 flex items-center justify-center shadow-md light:from-orange-100 light:to-orange-50">
                    <span className="text-orange-600/70 font-extrabold text-lg font-mono">III</span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Remaining Ranks List */}
          <div className="divide-y divide-white/5 light:divide-slate-200/80 pt-2">
            {remainingProfiles.map((p, idx) => {
              const rank = idx + 4;
              const isSelf = p.id === currentUserId;
              
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between py-3.5 ${
                    isSelf ? 'bg-amber-500/5 -mx-4 px-4 rounded-xl' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Circle */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${getRankBadge(rank)}`}>
                      {rank}
                    </div>
                    {/* Name & Role */}
                    <div className="flex flex-col">
                      <span className="font-black text-white text-sm flex items-center gap-1.5">
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

                  {/* Score */}
                  <div className="text-right">
                    <span className="font-black text-amber-500 text-sm">
                      {p.score.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold ml-1">修為</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* 👥 小隊修為榜 */
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <h3 className="text-center font-black text-white text-base tracking-widest flex items-center justify-center gap-1.5 mb-4">
            <Users size={18} className="text-yellow-500" />
            小隊修為排行榜
          </h3>

          {/* 🏆 Podium (小隊頒獎台) */}
          {topTeams.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-8 pt-10 pb-6 border-b border-white/5 select-none light:border-slate-200">
              
              {/* 2nd Place (Silver) */}
              {topTeams[1] && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-[0_0_15px_rgba(203,213,225,0.3)] border border-white/20">
                      {getTeamDisplayName(topTeams[1]).substring(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                      2
                    </span>
                  </div>
                  <span className="font-black text-white text-xs mt-2 truncate w-24 text-center light:text-slate-900">
                    {getTeamDisplayName(topTeams[1])}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {topTeams[1].total_score.toLocaleString()} 分
                  </span>
                  
                  {/* Pedestal */}
                  <div className="h-16 w-24 mt-3 rounded-t-xl bg-gradient-to-t from-slate-800/80 to-slate-700/30 border border-slate-700/40 flex items-center justify-center shadow-lg light:from-slate-200 light:to-slate-100">
                    <span className="text-slate-500 font-extrabold text-xl font-mono">II</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold) */}
              {topTeams[0] && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 -mt-4">
                  <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-yellow-300/30">
                      {getTeamDisplayName(topTeams[0]).substring(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-900">
                      1
                    </span>
                  </div>
                  <span className="font-black text-amber-200 text-sm mt-2 truncate w-28 text-center light:text-amber-600">
                    {getTeamDisplayName(topTeams[0])}
                  </span>
                  <span className="text-[10px] font-bold text-amber-400">
                    {topTeams[0].total_score.toLocaleString()} 分
                  </span>
                  
                  {/* Pedestal */}
                  <div className="h-24 w-28 mt-3 rounded-t-xl bg-gradient-to-t from-amber-600/80 to-amber-500/30 border border-amber-500/40 flex items-center justify-center shadow-2xl relative overflow-hidden light:from-amber-100 light:to-amber-50">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                    <span className="text-amber-500/70 font-extrabold text-2xl font-mono">I</span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {topTeams[2] && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-slate-950 font-black flex items-center justify-center text-base shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-white/20">
                      {getTeamDisplayName(topTeams[2]).substring(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-900">
                      3
                    </span>
                  </div>
                  <span className="font-black text-white text-xs mt-2 truncate w-24 text-center light:text-slate-900">
                    {getTeamDisplayName(topTeams[2])}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {topTeams[2].total_score.toLocaleString()} 分
                  </span>
                  
                  {/* Pedestal */}
                  <div className="h-12 w-24 mt-3 rounded-t-xl bg-gradient-to-t from-orange-900/60 to-orange-850/30 border border-orange-800/40 flex items-center justify-center shadow-md light:from-orange-100 light:to-orange-50">
                    <span className="text-orange-600/70 font-extrabold text-lg font-mono">III</span>
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
                    {/* Rank Circle */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${getRankBadge(rank)}`}>
                      {rank}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-black text-white text-sm">
                        {getTeamDisplayName(team)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Award size={10} />
                        隊長：{captain ? captain.name : '（未指定）'} • 隊員：{team.memberCount} 人
                      </span>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="text-right flex flex-col items-end">
                    <div>
                      <span className="font-black text-amber-500 text-sm">
                        {team.total_score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold ml-1">總分</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-[10px] text-slate-500 font-mono mt-0.5">
                      <Zap size={10} className="text-amber-500/70" />
                      人均：{team.averageScore.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
