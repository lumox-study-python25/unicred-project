'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ReviewModalProps {
  isOpen: boolean;
  jobId: string;
  workerId: string;
  onClose: () => void;
  onSubmitReview: (jobId: string, workerId: string, stars: number, proofUrl: string | null) => Promise<void>;
}

export default function ReviewModal({
  isOpen,
  jobId,
  workerId,
  onClose,
  onSubmitReview,
}: ReviewModalProps) {
  const [stars, setStars] = useState<number>(5);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Force proof upload if rating is <= 2 stars
    if (stars <= 2 && !proofFile) {
      return setErrorMsg('Bắt buộc phải tải lên ảnh minh chứng/báo cáo lỗi cho đánh giá dưới 3 sao.');
    }

    setIsSubmitting(true);

    try {
      let proofUrl = null;

      // 1. Upload proof file if exists
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${jobId}-${Date.now()}.${fileExt}`;
        const filePath = `proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('unicred-media')
          .upload(filePath, proofFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('unicred-media')
          .getPublicUrl(filePath);

        proofUrl = data.publicUrl;
      }

      // 2. Submit rating and complete job
      await onSubmitReview(jobId, workerId, stars, proofUrl);
      onClose();
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình nghiệm thu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative w-full max-w-md rounded-2xl border border-border-color bg-card-bg p-6 shadow-2xl animate-scale-in z-10">
        <h3 className="text-lg font-bold text-foreground mb-1">Nghiệm thu & Đánh giá</h3>
        <p className="text-xs text-text-muted mb-6">
          Vui lòng đánh giá hiệu quả hoàn thành công việc của freelancer để giải ngân quỹ.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-500">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star selector */}
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Chọn mức độ hài lòng
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setStars(star);
                    setErrorMsg('');
                  }}
                  className="text-3xl hover:scale-110 active:scale-95 transition-transform duration-100 cursor-pointer focus:outline-none"
                >
                  {star <= stars ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <span className="text-sm font-bold text-amber-500 mt-1">
              {stars === 5 && '🔥 Xuất sắc / Vượt mong đợi'}
              {stars === 4 && '✨ Rất hài lòng / Đạt yêu cầu'}
              {stars === 3 && '👍 Tạm ổn / Vừa đủ'}
              {stars === 2 && '⚠️ Cần cải thiện / Trễ hạn'}
              {stars === 1 && '👎 Rất tệ / Không hoàn thành'}
            </span>
          </div>

          {/* Dispute Proof Upload Area (Conditional <= 2 stars) */}
          {stars <= 2 && (
            <div className="rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 p-4 animate-fade-in">
              <label htmlFor="proof-upload" className="block text-xs font-bold uppercase tracking-wider text-rose-500 mb-1.5">
                Tải lên minh chứng (Bắt buộc)
              </label>
              <input
                id="proof-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-rose-500/10 file:text-rose-500 hover:file:bg-rose-500/20 file:cursor-pointer"
              />
              <p className="text-[10px] text-text-muted mt-2">
                * Cung cấp ảnh chụp màn hình hội thoại hoặc bằng chứng lỗi sản phẩm để làm căn cứ xử lý tranh chấp điểm uy tín.
              </p>
              {proofFile && (
                <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">
                  ✓ Đã chọn: {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-border-color">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-border-color px-4 py-2.5 text-xs font-bold text-foreground hover:bg-border-color transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-t-transparent border-white" />
                  Đang xử lý...
                </>
              ) : (
                'Hoàn thành & Giải ngân'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
