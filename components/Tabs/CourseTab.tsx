'use client';

import React from 'react';
import { Course, CourseAttendance, Profile, Team } from '@/types';
import { Calendar, ExternalLink, Info } from 'lucide-react';

interface CourseTabProps {
  courses: Course[];
  attendance?: CourseAttendance[];
  profiles?: Profile[];
  teams?: Team[];
  currentUserId?: string;
  onRegisterCourse?: (courseId: string) => Promise<void>;
  onMarkAttendance?: (courseId: string, studentId: string) => Promise<void>;
  isSyncing?: boolean;
}

export function CourseTab({ courses }: CourseTabProps) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="text-center space-y-2 select-none">
        <h2 className="text-xl font-black text-white italic tracking-wider flex items-center justify-center gap-2 light:text-slate-900">
          <Calendar className="text-red-500" size={20} />
          課程時間表與資訊中心
        </h2>
        <p className="text-xs text-slate-400 font-medium light:text-slate-600">
          提供複訊班次與其他相關課程時間資訊
        </p>
      </div>

      {/* Courses Feed */}
      <div className="space-y-4">
        {courses.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl text-center text-slate-500 font-bold text-sm">
            目前沒有發布中的課程或時間資訊。
          </div>
        ) : (
          courses.map((course) => {
            return (
              <div
                key={course.id}
                className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between gap-4 transition-all hover:border-white/10 light:bg-white light:border-slate-200 light:hover:border-slate-300"
              >
                <div className="space-y-3">
                  <h3 className="font-black text-amber-500 text-lg leading-snug light:text-amber-800">
                    {course.name}
                  </h3>
                  
                  <p className="text-xs text-slate-300 leading-relaxed light:text-slate-700 whitespace-pre-line font-medium">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4 light:border-slate-200 select-none">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 light:text-slate-600">
                    <Info size={12} />
                    請點擊右側按鈕前往課程報名
                  </span>

                  {course.register_url ? (
                    <a
                      href={course.register_url.startsWith('http') ? course.register_url : `https://${course.register_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 border border-purple-500/30 px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-900/20 cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      前往課程報名連結
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-800/50 border border-white/5 px-4 py-2 rounded-xl select-none cursor-not-allowed light:bg-slate-100 light:text-slate-400 light:border-slate-200">
                      報名尚未開放
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
