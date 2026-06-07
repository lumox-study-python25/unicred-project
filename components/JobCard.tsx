'use client';

import React, { useState } from 'react';

export interface Job {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  assigned_to?: string | null;
  client_approved?: boolean;
  worker_approved?: boolean;
  deadline?: string;
  category: string;
  location?: string;
  created_at?: string;
  owner?: {
    email: string;
    name?: string;
    is_verified?: boolean;
    credits?: number;
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
    credits?: number;
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
    credits?: number;
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
  onCompleteClick: (jobId: string, workerId: string) => void;
  onOpenChat: (jobId: string, workerId: string, otherName: string, jobTitle: string) => void;
  onApproveCompletion?: (jobId: string, role: 'client' | 'worker') => Promise<void>;
  onOpenAppealModal?: (ratingId: string, jobTitle: string) => void;
  onOpenReviewModal?: (jobId: string, ratedUserId: string, jobTitle: string) => void;
  jobReviews?: any[];
  userAppeals?: any[];
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
  onOpenChat,
  onApproveCompletion,
  onOpenAppealModal,
  onOpenReviewModal,
  jobReviews = [],
  userAppeals = [],
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

  const handleApproveClick = async (role: 'client' | 'worker') => {
    setLoadingAction(`approve-${role}`);
    try {
      if (onApproveCompletion) {
        await onApproveCompletion(job.id, role);
      }
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

  // Extract credits
  const ownerCredits = job.owner?.credits ?? 100;
  const workerCredits = contract?.worker?.credits ?? 100;

  // Reputation logs calculations
  const clientReview = jobReviews.find(r => r.job_id === job.id && r.rater_id === job.created_by);
  const workerReview = jobReviews.find(r => r.job_id === job.id && r.rater_id === job.assigned_to);

  const myReview = activeUserId === job.created_by ? clientReview : workerReview;
  const partnerReview = activeUserId === job.created_by ? workerReview : clientReview;

  const myAppeal = partnerReview ? userAppeals.find(a => a.reputation_log_id === partnerReview.id) : null;

  // SLA 72h check
  const isWithin72Hours = (createdAtString?: string) => {
    if (!createdAtString) return false;
    const createdDate = new Date(createdAtString);
    const limitDate = new Date(createdDate.getTime() + 72 * 60 * 60 * 1000);
    return new Date() < limitDate;
  };

  return (
    <div className="group relative flex flex-col justify-between h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-indigo-500/30 hover:shadow-md">
      {/* Top Details */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Status Badge */}
          {job.status === 'open' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang tuyển
            </span>
          )}
          {job.status === 'in_progress' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Đang thực hiện
            </span>
          )}
          {job.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-600">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Đã hoàn thành
            </span>
          )}
          {job.status === 'cancelled' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Đã hủy bỏ
            </span>
          )}

          {/* Credits Display */}
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-indigo-650 flex items-center gap-1">
              🪙 30 credits
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-1 mb-1">
          {job.title}
        </h3>

        {/* Category & Location Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="rounded bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
            {CATEGORY_MAP[job.category] || '⚙️ Khác'}
          </span>
          <span className="rounded bg-gray-50 border border-gray-150 px-2 py-0.5 text-[10px] font-bold text-gray-500">
            📍 {job.location || 'Online'}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
          {job.description || 'Không có mô tả công việc.'}
        </p>

        {/* Info detail labels */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-150 rounded-xl p-3 mb-4">
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
              Đăng bởi
            </span>
            <span className="font-semibold text-gray-900 truncate block flex items-center gap-1">
              👤 {job.owner?.name || job.owner?.email?.split('@')[0] || 'Sinh Viên'}
              {job.owner?.is_verified && (
                <span className="text-[10px] text-blue-600 font-bold" title="Sinh viên đã xác thực">✓</span>
              )}
            </span>
            <span className="text-[10px] text-gray-500 font-medium block mt-0.5">
              🪙 Số dư: {ownerCredits} credits
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
              Hạn hoàn thành
            </span>
            <span className="font-semibold text-rose-500 flex items-center gap-1">
              📅 {formatVietnameseDate(job.deadline)}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              Thưởng: +10 credits
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Contextual controls based on role view */}
      <div className="mt-auto pt-4 border-t border-gray-150">
        
        {/* ======================================================== */}
        {/* EMPLOYER VIEW: HIRE OPTIONS                              */}
        {/* ======================================================== */}
        {activeView === 'hire' && (
          <div className="space-y-4">
            {/* 1. Job is open: Show candidates list */}
            {job.status === 'open' && (
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Danh sách ứng tuyển ({applications.length})
                </span>
                
                {applications.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">Chưa có sinh viên ứng tuyển...</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {applications.map((app) => {
                      const appCredits = app.user?.credits ?? 100;

                      return (
                        <div
                          key={app.id}
                          className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-150 rounded-xl p-2.5 shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-gray-900 truncate flex items-center gap-1">
                              {app.user?.name || app.user?.email || 'Sinh Viên'}
                            </span>
                            <span className="block text-[9px] text-gray-500 font-medium truncate">
                              🏫 {app.user?.university || 'Trường Đại học'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-bold mt-0.5">
                              🪙 {appCredits} credits
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onOpenChat(job.id, app.user_id, app.user?.name || app.user?.email || 'Sinh Viên', job.title)}
                              className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-gray-200"
                              title="Nhắn tin trò chuyện"
                            >
                              💬
                            </button>
                            <button
                              onClick={() => handleAccept(app.user_id)}
                              disabled={loadingAction !== null}
                              className="bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-bold text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                            >
                              {loadingAction === `accept-${app.user_id}` ? (
                                <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-white" />
                              ) : (
                                'Chọn nhận'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Job in progress: Show contract info & dual approval completion buttons */}
            {job.status === 'in_progress' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Người làm việc</span>
                    <span className="font-bold text-gray-900 block truncate flex items-center gap-1">
                      👤 {contract?.worker?.name || contract?.worker?.email || 'Freelancer'}
                    </span>
                    <span className="block text-[9px] text-gray-500 mt-0.5">🪙 Số dư: {workerCredits} credits</span>
                  </div>
                  <button
                    onClick={() => onOpenChat(job.id, contract?.worker_id || '', contract?.worker?.name || contract?.worker?.email || 'Sinh Viên', job.title)}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    💬 Nhắn tin
                  </button>
                </div>

                <button
                  onClick={() => handleApproveClick('client')}
                  disabled={loadingAction !== null}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {loadingAction === 'approve-client' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-white" />
                  ) : (
                    '✔️ Nghiệm thu & Hoàn thành'
                  )}
                </button>
              </div>
            )}

            {/* 3. Job is completed: Review & Appeal controls */}
            {job.status === 'completed' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 rounded-xl p-3 justify-center">
                  Hợp đồng hoàn thành & Thưởng đã gửi (+10 credits)
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Rate worker button */}
                  {!myReview ? (
                    <button
                      onClick={() => onOpenReviewModal && onOpenReviewModal(job.id, job.assigned_to || '', job.title)}
                      className="w-full text-center text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl py-2 hover:bg-indigo-100 transition-all cursor-pointer"
                    >
                      ⭐ Đánh giá Freelancer (Đánh giá ẩn)
                    </button>
                  ) : (
                    <div className="text-center text-xs text-gray-500 bg-gray-50 rounded-xl py-2 border border-gray-150">
                      Bạn đã đánh giá Freelancer: {myReview.stars} ⭐
                    </div>
                  )}

                  {/* Partner review and Appeal if low */}
                  {partnerReview && (
                    <div className="bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-xs">
                      {partnerReview.is_visible_to_public ? (
                        <div>
                          <p className="font-semibold text-gray-850 mb-1">
                            Freelancer đánh giá bạn: {partnerReview.stars} ⭐
                          </p>
                          {partnerReview.comment && (
                            <p className="text-gray-500 italic">"{partnerReview.comment}"</p>
                          )}
                          
                          {/* SLA 72h Appeal option if rating is low (<=2 stars) */}
                          {partnerReview.stars <= 2 && !myAppeal && isWithin72Hours(partnerReview.created_at) && (
                            <button
                              onClick={() => onOpenAppealModal && onOpenAppealModal(partnerReview.id, job.title)}
                              className="mt-2 text-rose-500 font-bold hover:underline cursor-pointer text-[11px]"
                            >
                              ⚖️ Khiếu nại điểm phạt (SLA 72h)
                            </button>
                          )}
                          
                          {myAppeal && (
                            <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-block">
                              Trạng thái khiếu nại: {myAppeal.status === 'Disputed_Frozen' ? 'Đang tranh chấp' : 'Đã giải quyết'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">
                          🔒 Đánh giá của Freelancer đang bị ẩn (Sẽ hiển thị khi bạn đánh giá hoặc sau 72h).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 4. Job is cancelled */}
            {job.status === 'cancelled' && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3.5 justify-center">
                Công việc đã bị hủy.
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
                  <div className="flex gap-2">
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-600 cursor-not-allowed"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Đã ứng tuyển
                    </button>
                    <button
                      onClick={() => onOpenChat(job.id, activeUserId, job.owner?.name || job.owner?.email || 'Nhà tuyển dụng', job.title)}
                      className="rounded-xl bg-indigo-650 hover:bg-indigo-650 text-white font-bold text-xs px-4 py-2.5 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      💬 Nhắn tin
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={loadingAction !== null || job.created_by === activeUserId}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    {loadingAction === 'apply' ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-white" />
                        Đang ứng tuyển...
                      </>
                    ) : job.created_by === activeUserId ? (
                      'Bài đăng của bạn'
                    ) : (
                      'Ứng tuyển việc này'
                    )}
                  </button>
                )}
              </>
            )}

            {/* 2. Job in progress: Show contract info */}
            {job.status === 'in_progress' && (
              <>
                {job.assigned_to === activeUserId ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3 justify-center">
                      <span className="h-2 w-2 rounded-full bg-amber-650 animate-pulse" />
                      Bạn đã được giao việc! Hãy bắt đầu thực hiện.
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenChat(job.id, activeUserId, job.owner?.name || job.owner?.email || 'Nhà tuyển dụng', job.title)}
                        className="w-full rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      >
                        💬 Nhắn tin trao đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-400 cursor-not-allowed"
                  >
                    Đã có người nhận việc
                  </button>
                )}
              </>
            )}

            {/* 3. Job is completed: Review & Appeal options */}
            {job.status === 'completed' && (
              <>
                {job.assigned_to === activeUserId ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 justify-center">
                      🎉 Hoàn thành! Đã nhận thưởng +10 credits
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {/* Rate client button */}
                      {!myReview ? (
                        <button
                          onClick={() => onOpenReviewModal && onOpenReviewModal(job.id, job.created_by, job.title)}
                          className="w-full text-center text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl py-2 hover:bg-indigo-100 transition-all cursor-pointer"
                        >
                          ⭐ Đánh giá Nhà tuyển dụng (Đánh giá ẩn)
                        </button>
                      ) : (
                        <div className="text-center text-xs text-gray-500 bg-gray-50 rounded-xl py-2 border border-gray-150">
                          Bạn đã đánh giá Nhà tuyển dụng: {myReview.stars} ⭐
                        </div>
                      )}

                      {/* Partner review and Appeal if low */}
                      {partnerReview && (
                        <div className="bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-xs">
                          {partnerReview.is_visible_to_public ? (
                            <div>
                              <p className="font-semibold text-gray-850 mb-1">
                                Nhà tuyển dụng đánh giá bạn: {partnerReview.stars} ⭐
                              </p>
                              {partnerReview.comment && (
                                <p className="text-gray-500 italic">"{partnerReview.comment}"</p>
                              )}
                              
                              {/* SLA 72h Appeal option if rating is low (<=2 stars) */}
                              {partnerReview.stars <= 2 && !myAppeal && isWithin72Hours(partnerReview.created_at) && (
                                <button
                                  onClick={() => onOpenAppealModal && onOpenAppealModal(partnerReview.id, job.title)}
                                  className="mt-2 text-rose-500 font-bold hover:underline cursor-pointer text-[11px]"
                                >
                                  ⚖️ Khiếu nại điểm phạt (SLA 72h)
                                </button>
                              )}
                              
                              {myAppeal && (
                                <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-block">
                                  Trạng thái khiếu nại: {myAppeal.status === 'Disputed_Frozen' ? 'Đang tranh chấp' : 'Đã giải quyết'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-[11px]">
                              🔒 Đánh giá của Nhà tuyển dụng đang bị ẩn (Sẽ hiển thị khi bạn đánh giá hoặc sau 72h).
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-400 cursor-not-allowed"
                  >
                    Công việc đã kết thúc
                  </button>
                )}
              </>
            )}
            
            {/* 4. Job is cancelled */}
            {job.status === 'cancelled' && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3.5 justify-center">
                Công việc đã bị hủy.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
