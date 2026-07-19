'use client';

import React from 'react';
import { Course, CourseAttendance, Profile, Team } from '@/types';
import { Calendar, ExternalLink, Info, CheckCircle2, Clock } from 'lucide-react';
import { formatBrandText } from '@/lib/brand';


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

export function CourseTab({
  courses,
  attendance = [],
  currentUserId,
  onRegisterCourse,
  isSyncing = false
}: CourseTabProps) {
  // 🔕 隱藏 App 內「登記複訊 / 已預約複訊」功能,只保留官方報名連結。想開回來改 true 即可。
  const SHOW_RETRAIN_RESERVE = false;
  // Sort courses by class_date if available
  const sortedCourses = [...courses].sort((a, b) => {
    if (a.sort_order !== null && b.sort_order !== null && a.sort_order !== undefined && b.sort_order !== undefined) {
      return a.sort_order - b.sort_order;
    }
    return new Date(a.class_date).getTime() - new Date(b.class_date).getTime();
  });

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
        {sortedCourses.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl text-center text-slate-500 font-bold text-sm">
            目前沒有發布中的課程或時間資訊。
          </div>
        ) : (
          sortedCourses.map((course) => {
            const parsedDate = course.class_date ? new Date(course.class_date) : null;
            
            // Check student attendance/registration status
            const attRecord = currentUserId
              ? attendance.find(a => a.course_id === course.id && a.student_id === currentUserId)
              : null;
            const isRegistered = attRecord?.status === 'registered';
            const isAttended = attRecord?.status === 'attended';

            return (
              <div
                key={course.id}
                className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col sm:flex-row justify-between gap-5 transition-all hover:border-white/10 light:bg-white light:border-slate-200 light:hover:border-slate-300 relative overflow-hidden"
              >
                {/* Colored border indicator for registered/attended states */}
                {isAttended && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                )}
                {isRegistered && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
                )}

                {/* Center: Course title, descriptions and status badges */}
                <div className="flex-1 space-y-2 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-amber-500 text-base leading-snug light:text-amber-800">
                      {formatBrandText(course.name)}
                    </h3>
                    
                    {isAttended && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 size={10} />
                        已出席
                      </span>
                    )}
                    {SHOW_RETRAIN_RESERVE && isRegistered && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        <Clock size={10} />
                        已預約複訊
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed light:text-slate-700 whitespace-pre-line font-medium">
                    {formatBrandText(course.description)}
                  </p>
                </div>

                {/* Right side: Action Buttons */}
                <div className="shrink-0 flex sm:flex-col justify-end sm:justify-center items-stretch gap-2 border-t border-white/5 pt-4 sm:border-t-0 sm:pt-0 light:border-slate-200 select-none">
                  {/* Register action inside game database */}
                  {SHOW_RETRAIN_RESERVE && !isRegistered && !isAttended && onRegisterCourse && currentUserId && (
                    <button
                      disabled={isSyncing}
                      onClick={() => onRegisterCourse(course.id)}
                      className="text-center text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all px-3 py-2 rounded-xl shadow-md border border-amber-400/20 cursor-pointer disabled:opacity-50"
                    >
                      登記複訊 ✓
                    </button>
                  )}

                  {/* Register official link */}
                  {course.register_url ? (
                    <a
                      href={course.register_url.startsWith('http') ? course.register_url : `https://${course.register_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center inline-flex items-center justify-center gap-1.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 border border-purple-500/30 px-3 py-2 rounded-xl transition-all shadow-md shadow-purple-900/20 cursor-pointer"
                    >
                      <ExternalLink size={11} />
                      官方報名連結
                    </a>
                  ) : (
                    <span className="text-center inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-800/50 border border-white/5 px-3 py-2 rounded-xl select-none cursor-not-allowed light:bg-slate-100 light:text-slate-400 light:border-slate-200">
                      報名未開放
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
