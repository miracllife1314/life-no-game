'use client';

import React from 'react';
import { Achievement, UserAchievement } from '@/types';
import { Medal, Flame, Sparkles, Trophy, Award, Lock } from 'lucide-react';

interface AchievementsTabProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  studentScore: number;
}

export function AchievementsTab({ achievements, userAchievements, studentScore }: AchievementsTabProps) {
  // Helper to check if an achievement is unlocked
  const isUnlocked = (achId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achId);
  };

  const getUnlockTime = (achId: string) => {
    const ua = userAchievements.find(ua => ua.achievement_id === achId);
    return ua ? new Date(ua.unlocked_at).toLocaleDateString() : '';
  };

  // Maps custom icon strings to Lucide components
  const renderIcon = (iconName: string | null, unlocked: boolean) => {
    const iconClass = unlocked ? 'text-amber-500' : 'text-slate-600';
    switch (iconName) {
      case 'Flame':
        return <Flame className={iconClass} size={32} />;
      case 'Sparkles':
        return <Sparkles className={iconClass} size={32} />;
      case 'Trophy':
        return <Trophy className={iconClass} size={32} />;
      default:
        return <Award className={iconClass} size={32} />;
    }
  };

  const unlockedCount = achievements.filter(ach => isUnlocked(ach.id)).length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Achievements summary box */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none light:bg-white light:border-slate-200">
        <div>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
            修行成就進度
          </h2>
          <p className="text-2xl font-black text-white mt-2">
            已解鎖 {unlockedCount} / {achievements.length} 個成就徽章
          </p>
        </div>
        
        {/* Progress bar */}
        <div className="flex-1 max-w-xs space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>解鎖率：{Math.round((unlockedCount / (achievements.length || 1)) * 100)}%</span>
            <span>當前分數：{studentScore.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden light:bg-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" 
              style={{ width: `${(unlockedCount / (achievements.length || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achievements.map((ach) => {
          const unlocked = isUnlocked(ach.id);
          
          return (
            <div
              key={ach.id}
              className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between h-56 transition-all relative overflow-hidden ${
                unlocked 
                  ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30 hover:shadow-lg hover:-translate-y-0.5' 
                  : 'border-white/5 opacity-60 light:bg-white light:border-slate-200'
              }`}
            >
              {/* Badge Icon */}
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                  unlocked 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-slate-900 border-white/5 light:bg-slate-100 light:border-slate-200'
                }`}>
                  {renderIcon(ach.icon_url, unlocked)}
                </div>

                {!unlocked && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-full light:bg-slate-100 light:border-slate-300">
                    <Lock size={10} />
                    未解鎖
                  </span>
                )}
                {unlocked && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 select-none">
                    已解鎖
                  </span>
                )}
              </div>

              {/* Text */}
              <div className="mt-4">
                <h3 className={`font-black text-base ${unlocked ? 'text-white' : 'text-slate-500'}`}>
                  {ach.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed light:text-slate-500">
                  {ach.description}
                </p>
              </div>

              {/* Requirement / Date */}
              <div className="text-[10px] text-slate-500 font-mono border-t border-white/5 pt-3 mt-4 flex justify-between items-center select-none light:border-slate-200">
                <span>
                  門檻：{ach.condition_value.toLocaleString()} 分
                </span>
                {unlocked && (
                  <span className="text-slate-600">
                    {getUnlockTime(ach.id)} 解鎖
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
