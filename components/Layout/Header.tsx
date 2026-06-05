'use client';

import React from 'react';
import { Sun, Moon, LogOut, ShieldAlert, Award, TrendingUp, RotateCcw, Bookmark } from 'lucide-react';
import { Profile, Team, Batch } from '@/types';

interface HeaderProps {
  profile: Profile;
  team: Team | null;
  batches: Batch[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onLogout: () => void;
  gmMode: boolean;
  setGmMode: (gm: boolean) => void;
  selectedGmRole: string;
  setSelectedGmRole: (role: string) => void;
}

export function Header({
  profile,
  team,
  batches,
  theme,
  toggleTheme,
  onLogout,
  gmMode,
  setGmMode,
  selectedGmRole,
  setSelectedGmRole
}: HeaderProps) {
  // Simple level formula: 1 level per 1000 score, starting at level 1, cap at level 99
  const userLevel = Math.min(99, Math.floor(profile.score / 1000) + 1);
  const userBatch = batches?.find(b => b.id === profile.batch_id);

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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg border border-white/10 select-none">
              {profile.name.substring(0, 2)}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-950 select-none">
              LV.{userLevel}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white">{profile.name}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(profile.role)}`}>
                {getRoleLabel(profile.role)}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-xs mt-1.5 text-slate-400 select-none">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {userBatch && (
                  <span className="flex items-center gap-0.5 whitespace-nowrap text-slate-300">
                    <Bookmark size={12} className="text-amber-500" />
                    {userBatch.name}
                  </span>
                )}
                {userBatch && <span className="w-1 h-1 bg-slate-700 rounded-full hidden sm:inline" />}
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
                    return team.custom_name ? `${displayName} (${team.custom_name})` : displayName;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp size={12} className="text-amber-500" />
                <span className="font-black text-amber-500/90">{profile.score.toLocaleString()}</span> 修為
              </div>
            </div>
          </div>
        </div>

        {/* Global actions (Right) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('確定要清除所有本地打卡紀錄與修改分數，並還原至 Google 試算表初始資料嗎？')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            title="重置系統資料 (還原試算表初始狀態)"
            className="btn-action w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-amber-500/70 hover:text-amber-500 hover:border-amber-500/20 cursor-pointer"
          >
            <RotateCcw size={18} />
          </button>

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
                原始大隊長
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
                模擬一般修行者
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
                模擬小隊長
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
