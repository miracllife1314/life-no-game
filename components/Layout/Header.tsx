'use client';

import React from 'react';
import { Sun, Moon, LogOut, ShieldAlert, Award, TrendingUp, Bookmark } from 'lucide-react';
import { Profile, Team, Batch, Achievement } from '@/types';

import { calculateLevelFromExp } from '@/lib/levelLogic';
import { getRankTitle } from '@/lib/titleLogic';

interface HeaderProps {
  profile: Profile;
  team: Team | null;
  batches: Batch[];
  achievements?: Achievement[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onLogout: () => void;
  gmMode: boolean;
  setGmMode: (gm: boolean) => void;
  selectedGmRole: string;
  setSelectedGmRole: (role: string) => void;
  userEnrollments?: Profile[];
  onSwitchCohort?: (batchId: string) => void;
}

export function Header({
  profile,
  team,
  batches,
  achievements = [],
  theme,
  toggleTheme,
  onLogout,
  gmMode,
  setGmMode,
  selectedGmRole,
  setSelectedGmRole,
  userEnrollments = [],
  onSwitchCohort
}: HeaderProps) {
  // Use unified level formula
  const userLevel = calculateLevelFromExp(profile.score);
  const userBatch = batches?.find(b => b.id === profile.batch_id);
  const rankTitle = getRankTitle(profile.score, achievements);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '指揮部・大隊長';
      case 'captain': return '小隊長';
      default: return '一般修行者';
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'captain': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  return (
    <header className="w-full z-20 flex flex-col border-b border-white/5 bg-slate-950/80 backdrop-blur-md transition-colors duration-300 light:bg-white/90 light:border-slate-200">
      {/* Main header row */}
      <div className="max-w-7xl w-full mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* User Card info (Left) */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex flex-col items-center justify-center text-white font-black shadow-lg border border-white/10 select-none">
              <span className="text-[10px] opacity-90 leading-tight">LEVEL</span>
              <span className="text-xl leading-none tracking-tighter">{userLevel}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-black text-lg text-white">{profile.name}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(profile.role)}`}>
                {getRoleLabel(profile.role)}
              </span>
              {/* 🪄 成就稱號:取自 total_score 成就的目前最高階,越高越華麗 */}
              <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${rankTitle.className}`}>
                {rankTitle.title}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-xs mt-1.5 text-slate-400 select-none">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-0.5 whitespace-nowrap">
                  <Award size={12} className="text-amber-500" />
                  {(() => {
                    if (!team) return '獨立修行者';
                    let displayName = team.name;
                    if (userBatch && displayName.startsWith(userBatch.name)) {
                      displayName = displayName.substring(userBatch.name.length);
                    }
                    const prefixes = ['NLP初階', 'NLP台中', 'NLP'];
                    for (const prefix of prefixes) {
                      if (displayName.startsWith(prefix)) {
                        displayName = displayName.substring(prefix.length);
                      }
                    }
                    displayName = displayName.replace(/^[\s·\-\#\s]+/, '');
                    return displayName;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp size={12} className="text-amber-500" />
                <span className="font-black text-amber-500/90">{profile.score.toLocaleString()}</span> 經驗
              </div>
            </div>
          </div>
        </div>

        {/* Global actions (Right) */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? '切換為亮色模式' : '切換為深色模式'}
            className="btn-action w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button
            onClick={onLogout}
            title="登出系統"
            className="btn-action w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/20"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* GM / Tester banner if user role is admin (matching the image) */}
      {profile.role === 'admin' && (
        <div className="w-full bg-slate-900 border-t border-white/5 py-2 px-4 light:bg-slate-200/50 light:border-slate-300 select-none">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1 text-amber-500">
              <ShieldAlert size={14} />
              GM模式角色模擬：
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setGmMode(false);
                  setSelectedGmRole('admin');
                }}
                className={`py-1 px-3 rounded-lg border text-[11px] transition-all cursor-pointer ${
                  !gmMode
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                原始大隊長模式
              </button>
              <button
                onClick={() => {
                  setGmMode(true);
                  setSelectedGmRole('student');
                }}
                className={`py-1 px-3 rounded-lg border text-[11px] transition-all cursor-pointer ${
                  gmMode && selectedGmRole === 'student'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                模擬學員模式
              </button>
              <button
                onClick={() => {
                  setGmMode(true);
                  setSelectedGmRole('captain');
                }}
                className={`py-1 px-3 rounded-lg border text-[11px] transition-all cursor-pointer ${
                  gmMode && selectedGmRole === 'captain'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                模擬小隊長模式
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
