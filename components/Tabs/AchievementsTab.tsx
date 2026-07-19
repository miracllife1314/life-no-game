'use client';

import React, { useState } from 'react';
import { Achievement, UserAchievement } from '@/types';
import { Award, Lock, Zap } from 'lucide-react';
import { BadgeIcon } from '../BadgeIcon';
import { formatAchievementText } from '@/lib/brand';


const TYPE_ORDER: Record<string, number> = {
  total_score: 1,
  consecutive_checkins: 2,
  mission_count: 3,
  witness_post_count: 4,
  pet_stage: 5,
};

interface AchievementsTabProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  studentScore: number;
}

export function AchievementsTab({ achievements, userAchievements, studentScore }: AchievementsTabProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'uncompleted'>('all');

  // Helper to check if an achievement is unlocked
  const isUnlocked = (achId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achId);
  };

  const getUnlockTime = (achId: string) => {
    const ua = userAchievements.find(ua => ua.achievement_id === achId);
    return ua ? new Date(ua.unlocked_at).toLocaleDateString() : '';
  };

  const unlockedCount = achievements.filter(ach => isUnlocked(ach.id)).length;

  // 1. Sort: 同類型一起，門檻少到多
  const sortedAchievements = [...achievements].sort((a, b) => {
    const orderA = TYPE_ORDER[a.condition_type || ''] || 99;
    const orderB = TYPE_ORDER[b.condition_type || ''] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.condition_value - b.condition_value;
  });

  // 2. Filter: 全部、已完成、未完成
  const filteredAchievements = sortedAchievements.filter(ach => {
    const unlocked = isUnlocked(ach.id);
    if (filter === 'completed') return unlocked;
    if (filter === 'uncompleted') return !unlocked;
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 p-6 bg-[#030303] text-white rounded-[2.5rem] border border-zinc-900 select-none shadow-[0_0_50px_rgba(0,0,0,0.85)]">
      
      {/* 👑 Summary Progress Box */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-[2rem] border border-amber-500/40 bg-[#070605] flex flex-row items-center justify-between gap-6 select-none shadow-[0_0_30px_rgba(245,158,11,0.08)]">
        
        <div className="flex-1 space-y-4 z-10">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
              我的成就進度
            </h2>
            <p className="text-xl md:text-2xl font-black mt-1" style={{ color: '#ffffff' }}>
              已解鎖 {unlockedCount} / {achievements.length} 個成就徽章
            </p>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono" style={{ color: '#94a3b8' }}>
              <span>解鎖率：{Math.round((unlockedCount / (achievements.length || 1)) * 100)}%</span>
              <span>當前分數：{studentScore.toLocaleString()}</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-600 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(251,191,36,0.65)]" 
                style={{ width: `${(unlockedCount / (achievements.length || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right emblem inside summary box */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0 z-10 overflow-visible">
          {/* Glow aura */}
          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-lg animate-pulse pointer-events-none" />

          {/* SVG wings & shield emblem */}
          <svg className="absolute inset-0 w-full h-full text-amber-500" viewBox="0 0 120 120">
            <polygon 
              points="60,25 90,42 90,78 60,95 30,78 30,42" 
              fill="#090806" 
              stroke="url(#crestGold)" 
              strokeWidth="2.5"
              filter="url(#crestGlow)"
            />
            <polygon 
              points="60,30 85,45 85,75 60,90 35,75 35,45" 
              fill="none" 
              stroke="url(#crestGold)" 
              strokeWidth="1"
              opacity="0.6"
            />
          </svg>

          {/* Inner lightning bolt */}
          <div className="absolute z-20 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]">
            <Zap size={20} className="fill-current" />
          </div>
        </div>
      </div>

      {/* 🎛️ Filter Tabs */}
      <div className="flex items-center justify-center gap-3 bg-zinc-950/60 p-1.5 rounded-2xl border border-zinc-900/80 w-fit mx-auto select-none">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider transition-all duration-200 cursor-pointer ${
            filter === 'all'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          全部 ({achievements.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider transition-all duration-200 cursor-pointer ${
            filter === 'completed'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          已完成 ({unlockedCount})
        </button>
        <button
          onClick={() => setFilter('uncompleted')}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider transition-all duration-200 cursor-pointer ${
            filter === 'uncompleted'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          未完成 ({achievements.length - unlockedCount})
        </button>
      </div>

      {/* 🏆 Horizontal Achievements List */}
      <div className="flex flex-col gap-4">
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-bold bg-[#0a0a0c] border border-zinc-900 rounded-[2rem] border-dashed">
            沒有符合條件的成就徽章
          </div>
        ) : (
          filteredAchievements.map((ach) => {
            const unlocked = isUnlocked(ach.id);
          
          return (
            <div
              key={ach.id}
              className={`w-full p-4 md:p-6 rounded-[2rem] border flex flex-row justify-between items-center min-h-[140px] md:h-36 transition-all relative overflow-hidden select-none ${
                unlocked 
                  ? 'border-amber-500 bg-[#090806] text-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.12)] hover:border-amber-400 hover:shadow-[0_0_35px_rgba(245,158,11,0.2)] hover:-translate-y-0.5' 
                  : 'border-zinc-805/85 bg-[#121214] text-slate-500 opacity-80'
              }`}
            >
              
              {/* Left Section: Double circle badge and description side-by-side */}
              <div className="flex-1 flex flex-col justify-between z-20 space-y-3 h-full pr-2 md:pr-4">
                <div className="flex items-center gap-3 md:gap-5">
                  {/* Double Circle Icon Frame */}
                  <BadgeIcon name={ach.icon_url} unlocked={unlocked} size={64} className="shrink-0" />

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-black text-base md:text-xl tracking-wide transition-colors" style={{ color: unlocked ? '#fbbf24' : '#94a3b8' }}>
                      {formatAchievementText(ach.title)}
                    </h3>
                    <p className="text-[11px] md:text-xs mt-0.5 transition-colors leading-relaxed" style={{ color: unlocked ? '#e2e8f0' : '#64748b' }}>
                      {formatAchievementText(ach.description)}
                    </p>
                  </div>
                </div>

                {/* Thin divider line */}
                <div className={`w-full h-[1px] ${unlocked ? 'bg-amber-500/20' : 'bg-zinc-800/60'}`} />

                {/* Bottom Meta Information */}
                <div className="flex justify-between items-center text-[10px] md:text-xs font-mono select-none">
                  <span style={{ color: unlocked ? '#f59e0b' : '#64748b' }}>
                    門檻：{
                      ach.condition_type === 'total_score' ? `${ach.condition_value.toLocaleString()} 分` :
                      ach.condition_type === 'consecutive_checkins' ? `連續修行 ${ach.condition_value} 天` :
                      ach.condition_type === 'mission_count' ? (
                        ach.title.includes('邀約') || 
                        ach.title.includes('推薦') || 
                        ach.title.includes('人') || 
                        (ach.target_mission_id && (
                          ach.target_mission_id.includes('invite') || 
                          ach.target_mission_id.includes('recom') || 
                          ach.target_mission_id.includes('2d77f56d') || 
                          ach.target_mission_id.includes('1bcc0eeb')
                        ))
                          ? `特定任務完成 ${ach.condition_value} 人`
                          : `特定任務完成 ${ach.condition_value} 次`
                      ) :
                      ach.condition_type === 'witness_post_count' ? `入選見證牆 ${ach.condition_value} 次` :
                      `神獸進化至第 ${ach.condition_value} 階段`
                    }
                  </span>
                  {unlocked && (
                    <span style={{ color: '#d97706' }}>
                      {getUnlockTime(ach.id)} 解鎖
                    </span>
                  )}
                </div>
              </div>

              {/* Right Section: Compact Crest Shield */}
              <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center z-10 shrink-0 select-none overflow-visible">
                {/* Crest layout - Resized to be compact */}
                <div className="relative w-full h-full flex items-center justify-center select-none overflow-visible">
                  {/* Glow background aura */}
                  {unlocked && (
                    <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-md animate-pulse pointer-events-none" />
                  )}

                  {/* Crest SVG (wings + shield hexagon) */}
                  <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 120 120">
                    <defs>
                      <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                      <linearGradient id="crestGrey" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                      <filter id="crestGlow">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.5" />
                      </filter>
                    </defs>

                    {/* Wings - Left */}
                    <g stroke={unlocked ? 'url(#crestGold)' : 'url(#crestGrey)'} strokeWidth="1.5" fill="none" strokeLinecap="round" filter={unlocked ? 'url(#crestGlow)' : undefined}>
                      <path d="M 42,35 C 25,32 10,48 18,65 C 20,70 28,78 38,82" />
                      <path d="M 40,48 C 20,48 12,65 24,78 C 28,82 35,85 41,88" />
                      <path d="M 42,62 C 28,65 20,80 34,90 C 38,92 42,93 45,94" />
                    </g>

                    {/* Wings - Right */}
                    <g stroke={unlocked ? 'url(#crestGold)' : 'url(#crestGrey)'} strokeWidth="1.5" fill="none" strokeLinecap="round" filter={unlocked ? 'url(#crestGlow)' : undefined}>
                      <path d="M 78,35 C 95,32 110,48 102,65 C 100,70 92,78 82,82" />
                      <path d="M 80,48 C 100,48 108,65 96,78 C 92,82 85,85 79,88" />
                      <path d="M 78,62 C 92,65 100,80 86,90 C 82,92 78,93 75,94" />
                    </g>

                    {/* Outer Hexagon Shield */}
                    <polygon 
                      points="60,25 90,42 90,78 60,95 30,78 30,42" 
                      fill={unlocked ? '#090806' : '#121214'} 
                      stroke={unlocked ? 'url(#crestGold)' : 'url(#crestGrey)'} 
                      strokeWidth="2.5"
                      filter={unlocked ? 'url(#crestGlow)' : undefined}
                    />
                    
                    {/* Inner Hexagon Shield */}
                    <polygon 
                      points="60,30 85,45 85,75 60,90 35,75 35,45" 
                      fill="none" 
                      stroke={unlocked ? 'url(#crestGold)' : 'url(#crestGrey)'} 
                      strokeWidth="1"
                      opacity="0.6"
                    />
                  </svg>

                  {/* Zap / Lock Icon inside the Crest */}
                  <div className={`absolute z-20 flex items-center justify-center transition-all ${
                    unlocked ? 'text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]' : 'text-zinc-650'
                  }`}>
                    {unlocked ? (
                      <Zap size={18} className="fill-current" />
                    ) : (
                      <Lock size={18} />
                    )}
                  </div>
                </div>
              </div>

              {/* Top-Right Badge Pill Button */}
              <div className="absolute top-3 right-3 z-20 select-none">
                {unlocked ? (
                  <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-amber-400 bg-black/60 px-2.5 py-1.5 rounded-full border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                    ⚡ 已解鎖
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-zinc-500 bg-black/40 px-2.5 py-1.5 rounded-full border border-zinc-800">
                    🔒 未解鎖
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);
}
