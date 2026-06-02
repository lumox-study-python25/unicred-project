'use client';

import React, { useState } from 'react';

export interface Job {
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'open' | 'in_progress' | 'completed';
  owner_id: string;
  deadline?: string;
  category: string;
  location?: string;
  created_at?: string;
  owner?: {
    email: string;
    name?: string;
    is_verified?: boolean;
  };
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  created_at: string;
  user?: {
    email: string;
    name?: string;
    reputation: number;
    university?: string;
  };
}

export interface Contract {
  id: string;
  job_id: string;
  worker_id: string;
  status: 'active' | 'completed';
  worker?: {
    email: string;
    name?: string;
  };
}

interface JobCardProps {
  job: Job;
  activeUserId: string;
  activeView: 'hire' | 'earn';
  applications: Application[];
  applied: boolean;
  contract: Contract | null;
  onApply: (jobId: string) => Promise<void>;
  onAcceptApplicant: (jobId: string, workerId: string) => Promise<void>;
  onCompleteClick: (jobId: string, workerId: string) => void; // Opens rating modal
}

const CATEGORY_MAP: Record<string, string> = {
  coding: '💻 Lập trình',
  design: '🎨 Thiết kế',
  writing: '✍️ Content',
  translation: '🌐 Dịch thuật',
  video: '🎥 Media',
  others: '⚙️ Việc khác',
};

export default function JobCard({
  job,
  activeUserId,
  activeView,
  applications = [],
  applied = false,
  contract = null,
  onApply,
  onAcceptApplicant,
  onCompleteClick,
}: JobCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleApply = async () => {
    setLoadingAction('apply');
    try {
      await onApply(job.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = async (workerId: string) => {
    setLoadingAction(`accept-${workerId}`);
    try {
      await onAcceptApplicant(job.id, workerId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Date parsing to dd/mm/yyyy
  const formatVietnameseDate = (isoString?: string) => {
    if (!isoString) return 'Không giới hạn';
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) return 'Không giới hạn';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Compute Gamified Level: Lv. 1 up to Lv. 10
  const getLevel = (rep: number = 100) => {
    return Math.max(1, Math.min(10, Math.floor(rep / 100)));
  };

  return (
    <div className="group relative flex flex-col justify-between h-full rounded-2xl border border-border-color bg-card-bg p-6 shadow-card transition-all duration-300 hover:border-indigo-500/30 hover:shadow-md">
      {/* Top Details */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Status Badge */}
          {job.status === 'open' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang tuyển
            </span>
          )}
          {job.status === 'in_progress' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Đang làm việc
            </span>
          )}
          {job.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Đã hoàn thành
            </span>
          )}

          {/* Salary in VND */}
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {job.price.toLocaleString('vi-VN')}₫
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-200 line-clamp-1 mb-1">
          {job.title}
        </h3>

        {/* Category & Location Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
            {CATEGORY_MAP[job.category] || '⚙️ Khác'}
          </span>
          <span className="rounded bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-[10px] font-bold text-text-muted">
            📍 {job.location || 'Online'}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-text-muted leading-relaxed mb-4 line-clamp-3">
          {job.description || 'Không có mô tả công việc.'}
        </p>

        {/* Info detail labels */}
        <div className="grid grid-cols-2 gap-2 text-xs text-text-muted bg-background border border-border-color rounded-xl p-3 mb-6">
          <div>
            <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5">
              Đăng bởi
            </span>
            <span className="font-semibold text-foreground truncate block flex items-center gap-1">
              👤 {job.owner?.name || job.owner?.email?.split('@')[0] || 'Khách'}
              {job.owner?.is_verified && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400" title="Sinh viên đã xác thực">✓</span>
              )}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider mb-0.5">
              Hạn hoàn thành
            </span>
            <span className="font-semibold text-rose-500 flex items-center gap-1">
              📅 {formatVietnameseDate(job.deadline)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Contextual controls based on role view */}
      <div className="mt-auto pt-4 border-t border-border-color">
        
        {/* ======================================================== */}
        {/* EMPLOYER VIEW: HIRE OPTIONS                              */}
        {/* ======================================================== */}
        {activeView === 'hire' && (
          <div className="space-y-4">
            {/* 1. Job is open: Show candidates list */}
            {job.status === 'open' && (
              <div>
                <span className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Danh sách ứng tuyển ({applications.length})
                </span>
                
                {applications.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-1">Chưa có sinh viên ứng tuyển...</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {applications.map((app) => {
                      const rep = app.user?.reputation || 100;
                      const level = getLevel(rep);
                      const isHiringThisUser = loadingAction === `accept-${app.user_id}`;

                      return (
                        <div
                          key={app.id}
                          className="flex items-center justify-between gap-3 bg-background border border-border-color rounded-xl p-2.5 shadow-sm"
                        >
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-foreground truncate">
                              {app.user?.name || app.user?.email || 'Sinh Viên'}
                            </span>
                            <span className="block text-[9px] text-text-muted font-medium truncate">
                              🏫 {app.user?.university || 'Trường Đại học'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-0.5">
                              ⭐ {rep} <span className="bg-amber-500/10 border border-amber-500/20 px-1 rounded font-black text-[8px]">Cấp {level}</span>
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleAccept(app.user_id)}
                            disabled={loadingAction !== null}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[10px] font-bold text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          >
                            {isHiringThisUser ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white" />
                            ) : (
                              'Chọn'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Job in progress: Show contract info & complete review button */}
            {job.status === 'in_progress' && (
              <div className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs">
                  <span className="block text-[10px] uppercase text-text-muted font-bold mb-1">Người làm việc</span>
                  <span className="font-bold text-foreground block truncate">
                    👤 {contract?.worker?.name || contract?.worker?.email || 'Freelancer'}
                  </span>
                </div>

                <button
                  onClick={() => onCompleteClick(job.id, contract?.worker_id || '')}
                  disabled={loadingAction !== null}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer shadow-md"
                >
                  ✔️ Nghiệm thu & Thanh toán
                </button>
              </div>
            )}

            {/* 3. Job is completed */}
            {job.status === 'completed' && (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3.5 justify-center">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Hợp đồng đã hoàn thành & giải ngân
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* FREELANCER VIEW: EARN OPTIONS                            */}
        {/* ======================================================== */}
        {activeView === 'earn' && (
          <div>
            {/* 1. Job is open: Show apply buttons */}
            {job.status === 'open' && (
              <>
                {applied ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Đã ứng tuyển thành công
                  </button>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={loadingAction !== null || job.owner_id === activeUserId}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                  >
                    {loadingAction === 'apply' ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-white" />
                        Đang ứng tuyển...
                      </>
                    ) : job.owner_id === activeUserId ? (
                      'Bài đăng của bạn'
                    ) : (
                      'Ứng tuyển ngay'
                    )}
                  </button>
                )}
              </>
            )}

            {/* 2. Job in progress: Show contract info */}
            {job.status === 'in_progress' && (
              <>
                {contract?.worker_id === activeUserId ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 justify-center">
                    <span className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
                    Bạn đã được nhận! Hãy bắt đầu làm việc.
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-color bg-slate-100 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-text-muted cursor-not-allowed"
                  >
                    Đã có người nhận việc
                  </button>
                )}
              </>
            )}

            {/* 3. Job is completed */}
            {job.status === 'completed' && (
              <>
                {contract?.worker_id === activeUserId ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 justify-center">
                    🎉 Hoàn thành & Nhận thanh toán!
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-color bg-slate-100 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-text-muted cursor-not-allowed"
                  >
                    Công việc đã kết thúc
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
