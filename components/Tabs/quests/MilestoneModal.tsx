'use client';

import React from 'react';
import { Flame, Layers, CalendarCheck, Shield, Award, Sprout, X, Check, Lock } from 'lucide-react';

interface MilestoneModalProps {
  milestone: {
    d: number;
    title: string;
    bonus: number;
    icon: string; // Emoji
    dbIcon?: string; // Database mapped icon string
    desc: string;
  } | null;
  dailyStreak: number;
  onClose: () => void;
}

const ICON_MAP: Record<string, any> = {
  Flame: Flame,
  Layers: Layers,
  CalendarCheck: CalendarCheck,
  Shield: Shield,
  Award: Award,
  Sprout: Sprout,
};

export function MilestoneModal({ milestone, dailyStreak, onClose }: MilestoneModalProps) {
  if (!milestone) return null;

  const isUnlocked = dailyStreak >= milestone.d;
  const daysRemaining = milestone.d - dailyStreak;

  // Resolve which Lucide icon to show based on the database milestones
  let IconComponent = GiftIconComponent(milestone.d);

  function GiftIconComponent(days: number) {
    switch (days) {
      case 0:
        return Sprout;
      case 3:
        return Flame;
      case 7:
        return Layers;
      case 14:
        return CalendarCheck;
      case 21:
        return Shield;
      case 30:
        return Award;
      default:
        return Award;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 modal-force-dark animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-white/10 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5"
          type="button"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Unlocked / Locked Status Badge */}
        <div className="flex justify-center pt-2">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
              <Check size={10} className="stroke-[3]" /> 已解鎖里程碑
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full uppercase">
              <Lock size={10} className="stroke-[3]" /> 未解鎖里程碑
            </span>
          )}
        </div>

        {/* Large Glowing Icon */}
        <div className="relative py-2 select-none flex justify-center">
          <div
            className={`absolute w-32 h-32 rounded-full blur-2xl opacity-20 animate-pulse ${
              isUnlocked ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          />
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center border transition-all duration-500 relative z-10 ${
              isUnlocked
                ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] rotate-3'
                : 'bg-slate-900/90 border-slate-800 text-slate-500 light:bg-slate-800'
            }`}
          >
            {IconComponent && (
              <IconComponent
                size={38}
                className={isUnlocked ? 'animate-pulse text-slate-950' : 'text-slate-600'}
              />
            )}
          </div>
        </div>

        {/* Title & Info */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white">
            {milestone.title}
          </h3>
          <p className="text-xs text-slate-400 font-bold">
            {milestone.d === 0 ? '修行起點' : `連續定課修行 ${milestone.d} 天`}
          </p>
        </div>

        {/* Description & Benefit Card */}
        <div className="bg-slate-950/80 border border-white/5 p-4 rounded-2xl text-left space-y-3">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block mb-1">里程碑成就內容</span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {milestone.desc}
            </p>
          </div>

          <div className="border-t border-white/5 pt-2.5">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">🎁 達成好處與獎勵</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                {milestone.bonus > 0 ? `+${milestone.bonus} EXP 經驗值` : '開啟連勝加分之旅'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {isUnlocked ? (milestone.bonus > 0 ? '已發放' : '已啟動') : '未獲得'}
              </span>
            </div>
            {milestone.bonus > 0 && (
              <p className="text-[9px] text-slate-500 mt-1">
                {isUnlocked 
                  ? '已自動加分，可用於神獸孵化進化與提升成長等級。' 
                  : '達成該里程碑時，系統將自動進行結算並發放經驗獎勵。'}
              </p>
            )}
          </div>
        </div>

        {/* Streak Details / Next step */}
        <div className="text-xs font-bold text-slate-400">
          {isUnlocked ? (
            <p className="text-emerald-400/90 flex items-center justify-center gap-1">
              🔥 目前連勝: <span className="font-extrabold text-white">{dailyStreak}</span> 天 (已征服本關卡)
            </p>
          ) : (
            <p className="text-amber-300 flex items-center justify-center gap-1">
              🔥 目前連勝: <span className="font-extrabold text-white">{dailyStreak}</span> 天，還差 <span className="text-amber-400 font-black text-sm">{daysRemaining}</span> 天解鎖
            </p>
          )}
        </div>

        {/* Confirm Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-95 shimmer-btn"
          >
            我瞭解了
          </button>
        </div>
      </div>
    </div>
  );
}
