'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Job } from './JobCard';

interface CreateJobFormProps {
  activeUserId: string;
  userCredits: number;
  isVerified: boolean;
  onJobCreated: (newJob: Job) => void;
  onCreditsUpdated: (newCredits: number) => void;
}

const CATEGORIES = [
  { value: 'coding', label: '💻 Lập trình & Dev' },
  { value: 'design', label: '🎨 Thiết kế & Đồ họa' },
  { value: 'writing', label: '✍️ Viết lách & Content' },
  { value: 'translation', label: '🌐 Dịch thuật & Ngôn ngữ' },
  { value: 'video', label: '🎥 Làm video & Media' },
  { value: 'others', label: '⚙️ Việc khác' },
];

export default function CreateJobForm({
  activeUserId,
  userCredits,
  isVerified,
  onJobCreated,
  onCreditsUpdated,
}: CreateJobFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coding');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Default deadline (7 days from now)
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setDeadline(defaultDate.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Verification check
    if (!isVerified) {
      return setErrorMsg('Tài khoản của bạn chưa được xác thực thẻ sinh viên! Vui lòng chờ quản trị viên duyệt để có thể đăng việc.');
    }

    // Validations
    if (!title.trim()) return setErrorMsg('Vui lòng nhập tiêu đề công việc.');
    
    // Credits check
    if (userCredits < 30) {
      return setErrorMsg('Số dư không đủ! Bạn cần có ít nhất 30 credits để đăng tuyển công việc.');
    }

    if (!description.trim()) return setErrorMsg('Vui lòng nhập mô tả chi tiết công việc.');

    const selectedDeadline = new Date(deadline);
    if (isNaN(selectedDeadline.getTime()) || selectedDeadline < new Date()) {
      return setErrorMsg('Vui lòng chọn thời hạn hoàn thành trong tương lai.');
    }

    setIsSubmitting(true);

    // AI content moderation check
    const ACADEMIC_CHEATING_KEYWORDS = ['thi hộ', 'chạy điểm', 'thi giùm', 'học hộ', 'gian lận', 'hack', 'lừa đảo', 'cheat', 'thi dùm', 'đăng hộ'];
    let isFlagged = false;
    let flaggedReason: string | null = null;

    const contentToScan = `${title.toLowerCase()} ${description.toLowerCase()}`;
    const detectedKeyword = ACADEMIC_CHEATING_KEYWORDS.find(keyword => contentToScan.includes(keyword));

    if (detectedKeyword) {
      isFlagged = true;
      flaggedReason = `Phát hiện từ khóa nghi ngờ gian lận học thuật hoặc lừa đảo: "${detectedKeyword}" (AI Content-Scan)`;
      console.warn(`[Job AI Moderation] Gắn cờ tin tuyển dụng "${title}" vì từ khóa: ${detectedKeyword}`);
    }

    try {
      // Insert new job record. The trigger handle_job_post_credits will automatically
      // validate the owner has >= 30 credits, deduct it, and create credit_logs.
      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            status: 'open',
            created_by: activeUserId,
            deadline: selectedDeadline.toISOString(),
            category,
            location: location.trim() || 'Online',
            is_flagged: isFlagged,
            flagged_reason: flaggedReason,
          },
        ])
        .select()
        .maybeSingle();

      if (insertError) throw insertError;

      if (data) {
        setSuccessMsg(`Đăng việc thành công! Hệ thống đã tự động khấu trừ 30 credits.`);
        
        // Reset form inputs (retaining default future date)
        setTitle('');
        setDescription('');
        setLocation('');
        setCategory('coding');
        
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setDeadline(defaultDate.toISOString().split('T')[0]);

        // Trigger updates in parent dashboard
        onCreditsUpdated(userCredits - 30);
        onJobCreated(data as Job);
      }
    } catch (err: any) {
      console.error('Error creating job:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình đăng việc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng việc mới</h2>
      <p className="text-xs text-gray-500 mb-6">
        Tìm sinh viên làm freelancer. Đăng việc tốn cố định 30 credits. Người nhận việc (Freelancer) hoàn thành sẽ nhận +10 credits.
      </p>

      {/* Info/Error Banners */}
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-500">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-500">
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Tiêu đề công việc
          </label>
          <input
            id="title"
            type="text"
            placeholder="Ví dụ: Lập trình Landing Page tuyển sinh FTU"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-gray-900 bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-sm"
          />
        </div>

        {/* Category Selection */}
        <div>
          <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Danh mục công việc
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-gray-900 bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-sm cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Info & Deadline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credits indicator */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Chi phí đăng việc
            </label>
            <div className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm font-semibold flex items-center">
              🪙 30 Credits
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Hạn chót công việc
            </label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-gray-900 bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-sm"
            />
          </div>
        </div>

        {/* Location (optional) */}
        <div>
          <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Địa điểm làm việc (Không bắt buộc)
          </label>
          <input
            id="location"
            type="text"
            placeholder="Ví dụ: Online hoặc Cơ sở 1 HUST, FTU..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-gray-900 bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Mô tả chi tiết công việc
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Nêu rõ yêu cầu kỹ thuật, tài liệu bàn giao, thời gian làm việc..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-gray-900 bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-white" />
              Đang đăng tuyển...
            </>
          ) : (
            `Đăng việc làm (Chi phí: 30 credits)`
          )}
        </button>
      </form>
    </div>
  );
}
