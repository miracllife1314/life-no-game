'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, Trophy, Medal, CalendarDays, 
  ScrollText, Compass, Swords, BookOpen,
  MoreHorizontal, X
} from 'lucide-react';
import { UserRole } from '@/types';

export type TabKey = 
  | 'daily' 
  | 'weekly' 
  | 'special' 
  | 'rank' 
  | 'achievements' 
  | 'course' 
  | 'witness'
  | 'history' 
  | 'captain' 
  | 'admin';

interface NavigationProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  userRole: UserRole;
}

export function Navigation({ activeTab, setActiveTab, userRole }: NavigationProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const showCaptain = userRole === 'captain' || userRole === 'admin';
  const showAdmin = userRole === 'admin';

  // Simply scroll the active tab into view if needed
  useEffect(() => {
    const activeBtn = document.getElementById(`nav-tab-${activeTab}`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // Complete list of menu items (used in Desktop)
  const menuItems = [
    { key: 'daily' as TabKey, label: '個人面板', icon: Flame, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' },
    { key: 'rank' as TabKey, label: '排行榜', icon: Trophy, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' },
    { key: 'achievements' as TabKey, label: '成就', icon: Medal, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' },
    { key: 'course' as TabKey, label: '課程', icon: CalendarDays, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' },
    { key: 'witness' as TabKey, label: '見證分享', icon: BookOpen, color: 'bg-purple-500 text-white shadow-purple-500/25' },
    { key: 'history' as TabKey, label: '明細', icon: ScrollText, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' },
    ...(showCaptain ? [{ key: 'captain' as TabKey, label: '指揮所', icon: Compass, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' }] : []),
    ...(showAdmin ? [{ key: 'admin' as TabKey, label: '指揮部', icon: Swords, color: 'bg-amber-500 text-slate-950 shadow-amber-500/25' }] : [])
  ];

  // Mobile Bottom Bar main items (4 slots)
  const mobileMainItems = [
    { key: 'daily' as TabKey, label: '個人面板', icon: Flame },
    { key: 'rank' as TabKey, label: '排行榜', icon: Trophy },
    { key: 'witness' as TabKey, label: '見證分享', icon: BookOpen },
    { key: 'course' as TabKey, label: '課程', icon: CalendarDays },
  ];

  // Mobile Bottom Bar extra items in Drawer
  const mobileMoreItems = [
    { key: 'achievements' as TabKey, label: '成就榮譽', icon: Medal },
    { key: 'history' as TabKey, label: '修行明細', icon: ScrollText },
    ...(showCaptain ? [{ key: 'captain' as TabKey, label: '小隊指揮所', icon: Compass }] : []),
    ...(showAdmin ? [{ key: 'admin' as TabKey, label: '大隊指揮部', icon: Swords }] : [])
  ];

  const isMoreActive = mobileMoreItems.some(item => item.key === activeTab);

  return (
    <>
      {/* ── Desktop Horizontal Navigation Tab Bar ──────────────────────── */}
      <nav className="hidden md:block w-full border-b border-white/5 bg-slate-950/40 backdrop-blur-md overflow-x-auto py-3 select-none scrollbar-none light:bg-white/40 light:border-slate-200">
        <div className="w-max mx-auto flex items-center gap-2 relative px-4">
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            
            return (
              <button
                key={item.key}
                id={`nav-tab-${item.key}`}
                onClick={() => setActiveTab(item.key)}
                className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-xs font-black transition-all duration-300 cursor-pointer relative z-10 scale-100 ${
                  isActive
                    ? item.key === 'witness'
                      ? 'bg-purple-500 shadow-lg shadow-purple-500/25 text-white'
                      : 'bg-amber-500 shadow-lg shadow-amber-500/25 text-slate-950'
                    : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:bg-slate-800/80 hover:text-slate-100 light:bg-slate-100 light:border-slate-300/50 light:text-slate-500 light:hover:bg-slate-200 light:hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation Bar ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 pb-safe select-none light:bg-white/80 light:border-slate-200">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileMainItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-black transition-all ${
                  isActive
                    ? item.key === 'witness'
                      ? 'text-purple-400 light:text-purple-600 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] light:drop-shadow-none'
                      : 'text-amber-400 light:text-amber-600 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] light:drop-shadow-none'
                    : 'text-slate-500 hover:text-slate-300 light:text-slate-400 light:hover:text-slate-600'
                }`}
              >
                <Icon size={18} />
                <span>{item.label === '見證分享' ? '見證' : item.label}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-black transition-all ${
              isMoreActive
                ? 'text-amber-400 light:text-amber-600 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] light:drop-shadow-none'
                : 'text-slate-500 hover:text-slate-300 light:text-slate-400 light:hover:text-slate-600'
            }`}
          >
            <MoreHorizontal size={18} />
            <span>更多</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Drawer ───────────────────────────────────────── */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center md:hidden animate-in fade-in duration-200"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="w-full bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300 light:bg-white light:border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5 light:border-slate-200">
              <h3 className="text-sm font-black text-slate-400 light:text-slate-500">更多功能選單</h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setIsDrawerOpen(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.15)] light:bg-amber-50 light:text-amber-600'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white light:bg-slate-50 light:border-slate-200 light:text-slate-600'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[11px] font-black">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
