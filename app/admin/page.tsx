'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  university: string | null;
  major: string | null;
  credits: number;
  reputation: number;
  is_verified: boolean;
  role: 'user' | 'admin';
  is_banned: boolean;
  flagged_reason: string | null;
  student_card_url: string | null;
}

interface AdminJob {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: 'open' | 'in_progress' | 'completed';
  owner_id: string;
  deadline: string | null;
  category: string;
  location: string | null;
  is_flagged: boolean;
  flagged_reason: string | null;
  created_at: string;
}

interface AdminRating {
  id: string;
  job_id: string;
  rater_id: string;
  rated_user_id: string;
  stars: number;
  proof_image_url: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  
  // Admin Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Navigation tabs: approvals | users | ai_moderation | disputes
  const [activeTab, setActiveTab] = useState<'approvals' | 'users' | 'ai_moderation' | 'disputes'>('approvals');
  
  // Operation states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all tables from database
  const loadAdminData = async () => {
    try {
      setLoadingData(true);
      setErrorMessage('');
      
      // Load all users
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .order('email', { ascending: true });
      if (usersErr) throw usersErr;

      // Load all jobs
      const { data: jobsData, error: jobsErr } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (jobsErr) throw jobsErr;

      // Load all ratings
      const { data: ratingsData, error: ratingsErr } = await supabase
        .from('ratings')
        .select('*')
        .order('created_at', { ascending: false });
      if (ratingsErr) throw ratingsErr;

      setUsers((usersData as AdminUser[]) || []);
      setJobs((jobsData as AdminJob[]) || []);
      setRatings((ratingsData as AdminRating[]) || []);
    } catch (err: any) {
      console.error('[Admin Load Error] Details:', JSON.stringify(err, null, 2));
      setErrorMessage(err.message || 'Lỗi khi đồng bộ dữ liệu quản trị viên.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (profile && profile.role === 'admin') {
      loadAdminData();
    }
  }, [profile]);

  const setSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const setError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // Authorization Security Check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-text-muted">Đang xác thực quyền Admin...</span>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-3xl font-black mb-4">
            🛑
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Từ chối truy cập!</h1>
          <p className="text-xs text-text-muted mb-6">
            Khu vực này chỉ dành riêng cho Quản trị viên (Admin) của UniCred Việt Nam. Tài khoản của bạn không được phân quyền truy cập.
          </p>
          <Link href="/" className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md active:scale-95 transition-all">
            Quay về Bảng tin việc làm
          </Link>
        </main>
      </div>
    );
  }

  // Admin Action Handlers
  const handleApproveStudent = async (userId: string) => {
    setActionLoading(`approve-${userId}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true, flagged_reason: null })
        .eq('id', userId);

      if (error) throw error;
      setSuccess('Đã phê duyệt và xác thực thẻ sinh viên thành công!');
      await loadAdminData();
    } catch (err: any) {
      console.error('[Admin Action Error] Approve failed:', JSON.stringify(err, null, 2));
      setError(err.message || 'Lỗi phê duyệt thẻ sinh viên.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineStudent = async (userId: string) => {
    setActionLoading(`decline-${userId}`);
    try {
      // Clear their student card, set verified to false and flag them
      const { error } = await supabase
        .from('users')
        .update({
          student_card_url: null,
          is_verified: false,
          flagged_reason: 'Ảnh thẻ sinh viên bị Admin từ chối do không rõ ràng hoặc giả mạo. Vui lòng tải lại ảnh mới.',
        })
        .eq('id', userId);

      if (error) throw error;
      setSuccess('Đã từ chối ảnh thẻ sinh viên và gửi yêu cầu tải lại.');
      await loadAdminData();
    } catch (err: any) {
      console.error('[Admin Action Error] Decline failed:', JSON.stringify(err, null, 2));
      setError(err.message || 'Lỗi từ chối thẻ sinh viên.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBanUser = async (userId: string, currentBanStatus: boolean) => {
    setActionLoading(`ban-${userId}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: !currentBanStatus })
        .eq('id', userId);

      if (error) throw error;
      setSuccess(currentBanStatus ? 'Đã mở khóa tài khoản thành công!' : 'Đã khóa tài khoản thành viên thành công!');
      await loadAdminData();
    } catch (err: any) {
      console.error('[Admin Action Error] Ban toggling failed:', JSON.stringify(err, null, 2));
      setError(err.message || 'Lỗi cập nhật trạng thái khóa tài khoản.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissUserFlag = async (userId: string) => {
    setActionLoading(`dismiss-user-${userId}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({ flagged_reason: null })
        .eq('id', userId);

      if (error) throw error;
      setSuccess('Đã gỡ cờ cảnh báo nghi ngờ đối với thành viên!');
      await loadAdminData();
    } catch (err: any) {
      console.error('[Admin Action Error] Dismiss flag failed:', JSON.stringify(err, null, 2));
      setError(err.message || 'Lỗi gỡ cờ thành viên.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissJobFlag = async (jobId: string) => {
    setActionLoading(`dismiss-job-${jobId}`);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_flagged: false, flagged_reason: null })
        .eq('id', jobId);

      if (error) throw error;
      setSuccess('Đã gỡ cờ cảnh báo nghi ngờ đối với công việc đăng tải!');
      await loadAdminData();
    } catch (err: any) {
      console.error('[Admin Action Error] Dismiss job flag failed:', JSON.stringify(err, null, 2));
      setError(err.message || 'Lỗi gỡ cờ công việc.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng tuyển dụng này không?')) return;
    setActionLoading(`delete-job-${jobId}`);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      setSuccess('Đã xóa vĩnh viễn tin tuyển dụng vi phạm!');
      await loadAdminData();
    } catch (err: any) {
      console.error('[Admin Action Error] Delete job failed:', JSON.stringify(err, null, 2));
      setError(err.message || 'Lỗi xóa công việc tuyển dụng.');
    } finally {
      setActionLoading(null);
    }
  };

  // Helper Maps for UI lookups
  const userMap = new Map(users.map(u => [u.id, u]));
  const jobMap = new Map(jobs.map(j => [j.id, j]));

  // Categorize elements
  const pendingApprovals = users.filter(u => !u.is_verified && u.student_card_url);
  const flaggedUsers = users.filter(u => u.flagged_reason);
  const flaggedJobs = jobs.filter(j => j.is_flagged);
  
  // Dispute ratings are those with 1 or 2 stars
  const disputes = ratings.filter(r => r.stars <= 2);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Banner Alert System */}
        {successMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5 shadow-2xl backdrop-blur-md text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3.5 shadow-2xl backdrop-blur-md text-sm font-bold text-rose-600 dark:text-rose-400">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Dashboard Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border-color mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Bảng quản trị tối cao (Admin Portal)</h1>
            <p className="text-xs text-text-muted mt-1">
              Hệ thống kiểm duyệt, phân quyết tranh chấp, quản trị tài khoản học đường và xem vết rà quét AI tự động.
            </p>
          </div>
          <button
            onClick={loadAdminData}
            disabled={loadingData}
            className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold hover:text-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            {loadingData ? 'Đang làm mới...' : '🔄 Làm mới dữ liệu'}
          </button>
        </div>

        {/* Top-row dashboard stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-border-color bg-card-bg p-5 shadow-card">
            <span className="text-[10px] font-black uppercase text-text-muted tracking-wider">Tổng thành viên</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-foreground">{users.length}</span>
              <span className="text-[10px] text-text-muted">sinh viên</span>
            </div>
          </div>
          
          <div className="rounded-2xl border border-border-color bg-card-bg p-5 shadow-card">
            <span className="text-[10px] font-black uppercase text-text-muted tracking-wider">Chờ duyệt thẻ</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${pendingApprovals.length > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                {pendingApprovals.length}
              </span>
              <span className="text-[10px] text-text-muted">yêu cầu</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border-color bg-card-bg p-5 shadow-card">
            <span className="text-[10px] font-black uppercase text-text-muted tracking-wider">Bộ lọc AI Cảnh báo</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${flaggedUsers.length + flaggedJobs.length > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                {flaggedUsers.length + flaggedJobs.length}
              </span>
              <span className="text-[10px] text-text-muted">gắn cờ</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border-color bg-card-bg p-5 shadow-card">
            <span className="text-[10px] font-black uppercase text-text-muted tracking-wider">Tranh chấp Đơn hàng</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${disputes.length > 0 ? 'text-indigo-600' : 'text-foreground'}`}>
                {disputes.length}
              </span>
              <span className="text-[10px] text-text-muted">vụ việc</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-border-color mb-8 gap-1.5 overflow-x-auto pb-1.5">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-text-muted hover:text-foreground border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            📋 Phê duyệt sinh viên ({pendingApprovals.length})
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-text-muted hover:text-foreground border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            👥 Quản lý thành viên ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('ai_moderation')}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai_moderation'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-text-muted hover:text-foreground border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            🤖 Bộ lọc AI quét ({flaggedUsers.length + flaggedJobs.length})
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'disputes'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-text-muted hover:text-foreground border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            ⚖️ Phân quyết Tranh chấp ({disputes.length})
          </button>
        </div>

        {/* Main Tab Panels */}
        {loadingData ? (
          <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-4" />
            <span className="text-xs text-text-muted">Đang nạp kho dữ liệu quản trị...</span>
          </div>
        ) : (
          <div className="animate-fade-in">
            
            {/* ========================================== */}
            {/* TAB: STUDENT CARD APPROVALS                */}
            {/* ========================================== */}
            {activeTab === 'approvals' && (
              <div className="space-y-6">
                {pendingApprovals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border-color bg-card-bg/20 py-16 text-center max-w-md mx-auto">
                    <span className="text-3xl block mb-3">🎉</span>
                    <h3 className="text-base font-bold mb-1 text-foreground">Sạch bóng yêu cầu</h3>
                    <p className="text-xs text-text-muted">
                      Hiện tại không có thẻ sinh viên nào đang nằm trong hàng đợi phê duyệt của bạn.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingApprovals.map((std) => (
                      <div key={std.id} className="rounded-2xl border border-border-color bg-card-bg p-6 shadow-card flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                              <h3 className="text-base font-bold text-foreground truncate">{std.name || 'Chưa cập nhật'}</h3>
                              <span className="text-[10px] text-text-muted block">{std.email}</span>
                            </div>
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-500">
                              Chờ xác thực
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-4 text-left">
                            <div className="bg-background rounded-xl p-2.5 border border-border-color">
                              <span className="block text-[9px] uppercase font-black text-text-muted">Trường học</span>
                              <span className="font-bold text-foreground block truncate mt-0.5">{std.university}</span>
                            </div>
                            <div className="bg-background rounded-xl p-2.5 border border-border-color">
                              <span className="block text-[9px] uppercase font-black text-text-muted">Chuyên ngành</span>
                              <span className="font-bold text-foreground block truncate mt-0.5">{std.major}</span>
                            </div>
                          </div>

                          {std.student_card_url ? (
                            <div className="rounded-xl overflow-hidden border border-border-color bg-background p-2 mb-4">
                              <span className="block text-[8px] font-black uppercase text-text-muted mb-1.5">Ảnh chụp thẻ sinh viên:</span>
                              <img
                                src={std.student_card_url}
                                alt="Thẻ sinh viên"
                                className="w-full h-44 object-contain rounded-lg bg-slate-900 border border-border-color shadow-sm"
                              />
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border-color py-8 text-center text-xs text-text-muted bg-background mb-4">
                              Không có ảnh thẻ sinh viên tải lên
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveStudent(std.id)}
                            disabled={actionLoading !== null}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md cursor-pointer transition-all active:scale-98"
                          >
                            {actionLoading === `approve-${std.id}` ? 'Đang duyệt...' : '✓ Duyệt xác thực'}
                          </button>
                          <button
                            onClick={() => handleDeclineStudent(std.id)}
                            disabled={actionLoading !== null}
                            className="py-2.5 px-4 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-600 font-bold text-xs cursor-pointer transition-all active:scale-98"
                          >
                            {actionLoading === `decline-${std.id}` ? 'Đang từ chối...' : '✕ Từ chối'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* TAB: USER MANAGEMENT                       */}
            {/* ========================================== */}
            {activeTab === 'users' && (
              <div className="rounded-2xl border border-border-color bg-card-bg overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border-color text-text-muted font-bold">
                        <th className="p-4 uppercase tracking-wider">Thành viên</th>
                        <th className="p-4 uppercase tracking-wider">Trường & Chuyên ngành</th>
                        <th className="p-4 uppercase tracking-wider text-center">Uy tín / Cấp độ</th>
                        <th className="p-4 uppercase tracking-wider text-right">Số dư ví (VND)</th>
                        <th className="p-4 uppercase tracking-wider text-center">Trạng thái</th>
                        <th className="p-4 uppercase tracking-wider text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {users.map((u) => {
                        const level = Math.max(1, Math.min(10, Math.floor(u.reputation / 100)));
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-md">
                                  {u.name ? u.name.slice(0, 2).toUpperCase() : 'SV'}
                                </div>
                                <div>
                                  <span className="font-bold text-foreground block">{u.name || 'Sinh viên'}</span>
                                  <span className="text-[10px] text-text-muted block">{u.email}</span>
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-4 max-w-[200px]">
                              <span className="text-foreground font-bold block truncate">{u.university || 'Chưa rõ'}</span>
                              <span className="text-[10px] text-text-muted block truncate">{u.major || 'Chưa cập nhật'}</span>
                            </td>

                            <td className="p-4 text-center">
                              <span className="font-extrabold text-amber-500 block">⭐ {u.reputation}</span>
                              <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-500 block mt-0.5">Lv.{level}</span>
                            </td>

                            <td className="p-4 text-right font-black text-foreground">
                              {u.credits.toLocaleString('vi-VN')}₫
                            </td>

                            <td className="p-4 text-center">
                              {u.is_banned ? (
                                <span className="inline-flex rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase text-rose-500">
                                  Đang khóa
                                </span>
                              ) : u.is_verified ? (
                                <span className="inline-flex rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase text-blue-500">
                                  Đã xác thực
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase text-amber-500">
                                  Chờ duyệt thẻ
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-center">
                              <div className="inline-flex gap-1.5">
                                <button
                                  onClick={() => handleToggleBanUser(u.id, u.is_banned)}
                                  disabled={actionLoading !== null || u.role === 'admin'}
                                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all disabled:opacity-30 ${
                                    u.is_banned
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                      : 'border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                                  }`}
                                >
                                  {actionLoading === `ban-${u.id}` ? '...' : u.is_banned ? 'Mở khóa' : 'Khóa'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB: AI MODERATION                         */}
            {/* ========================================== */}
            {activeTab === 'ai_moderation' && (
              <div className="space-y-8">
                
                {/* 1. Flagged Job Listings */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    🤖 Công việc bị gắn cờ cảnh báo học thuật
                    <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-500">
                      {flaggedJobs.length}
                    </span>
                  </h3>

                  {flaggedJobs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-color bg-card-bg/20 py-10 text-center max-w-sm mx-auto">
                      <span className="text-2xl block mb-2">🛡️</span>
                      <h4 className="text-xs font-bold mb-0.5 text-foreground">Không có tin đăng vi phạm</h4>
                      <p className="text-[10px] text-text-muted">
                        Mọi tin đăng đều hợp lệ, không chứa từ khóa gian lận thi cử.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {flaggedJobs.map((jb) => {
                        const owner = userMap.get(jb.owner_id);
                        return (
                          <div key={jb.id} className="rounded-2xl border border-rose-500/20 bg-card-bg p-6 shadow-card flex flex-col justify-between border-l-4">
                            <div>
                              <div className="flex justify-between items-start gap-4 mb-2">
                                <h4 className="text-base font-black text-rose-600 truncate">{jb.title}</h4>
                                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm whitespace-nowrap">
                                  {jb.price.toLocaleString('vi-VN')}₫
                                </span>
                              </div>

                              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs font-semibold text-rose-500 mb-4 text-left">
                                🚨 **Lý do quét cờ AI:** {jb.flagged_reason}
                              </div>

                              <div className="text-xs text-text-muted space-y-1 mb-4 text-left">
                                <p>👤 **Người đăng:** <strong className="text-foreground">{owner?.name || 'Chưa cập nhật'}</strong> ({owner?.email})</p>
                                <p>💻 **Mục mô tả gốc:** {jb.description}</p>
                                <p>🌐 **Hình thức:** {jb.location || 'Online'}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 border-t border-border-color pt-4">
                              <button
                                onClick={() => handleDismissJobFlag(jb.id)}
                                disabled={actionLoading !== null}
                                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-indigo-500 disabled:opacity-50 text-xs font-bold transition-all cursor-pointer active:scale-98"
                              >
                                {actionLoading === `dismiss-job-${jb.id}` ? '...' : '✓ Bỏ qua / Gỡ cờ'}
                              </button>
                              <button
                                onClick={() => handleDeleteJob(jb.id)}
                                disabled={actionLoading !== null}
                                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer active:scale-98 shadow-sm"
                              >
                                {actionLoading === `delete-job-${jb.id}` ? '...' : '✕ Gỡ tin / Xóa'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Flagged Suspicious User Profiles */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    🤖 Thành viên có ảnh thẻ sinh viên giả mạo (Fake/Size Alert)
                    <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-500">
                      {flaggedUsers.length}
                    </span>
                  </h3>

                  {flaggedUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-color bg-card-bg/20 py-10 text-center max-w-sm mx-auto">
                      <span className="text-2xl block mb-2">🛡️</span>
                      <h4 className="text-xs font-bold mb-0.5 text-foreground">Không có hồ sơ đáng nghi</h4>
                      <p className="text-[10px] text-text-muted">
                        Mọi thành viên đều có ảnh thẻ đăng ký hợp lệ, không chứa ảnh giả mạo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {flaggedUsers.map((flg) => (
                        <div key={flg.id} className="rounded-2xl border border-rose-500/20 bg-card-bg p-6 shadow-card flex flex-col justify-between border-l-4">
                          <div>
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <div>
                                <h4 className="text-base font-bold text-foreground">{flg.name || 'Sinh viên'}</h4>
                                <span className="text-[10px] text-text-muted block">{flg.email}</span>
                              </div>
                              <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-rose-500">
                                Nghi vấn giả mạo
                              </span>
                            </div>

                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs font-semibold text-rose-500 mb-4 text-left">
                              🚨 **Phân tích của AI:** {flg.flagged_reason}
                            </div>

                            <div className="text-xs text-text-muted space-y-1 mb-4 text-left">
                              <p>🎓 **Trường & Chuyên ngành:** <strong className="text-foreground">{flg.university}</strong> ({flg.major})</p>
                            </div>

                            {flg.student_card_url && (
                              <div className="rounded-xl overflow-hidden border border-border-color bg-background p-2 mb-4">
                                <img
                                  src={flg.student_card_url}
                                  alt="Thẻ nghi ngờ"
                                  className="w-full h-36 object-contain rounded-lg bg-slate-900 border border-border-color"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 border-t border-border-color pt-4">
                            <button
                              onClick={() => handleDismissUserFlag(flg.id)}
                              disabled={actionLoading !== null}
                              className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-indigo-500 disabled:opacity-50 text-xs font-bold transition-all cursor-pointer active:scale-98"
                            >
                              {actionLoading === `dismiss-user-${flg.id}` ? '...' : '✓ Bỏ qua nghi ngờ'}
                            </button>
                            <button
                              onClick={() => handleDeclineStudent(flg.id)}
                              disabled={actionLoading !== null}
                              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer active:scale-98 shadow-sm"
                            >
                              {actionLoading === `decline-${flg.id}` ? '...' : '✕ Từ chối / Bắt nộp lại'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ========================================== */}
            {/* TAB: DISPUTES / LOW RATINGS                */}
            {/* ========================================== */}
            {activeTab === 'disputes' && (
              <div className="space-y-6">
                {disputes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border-color bg-card-bg/20 py-16 text-center max-w-md mx-auto">
                    <span className="text-3xl block mb-3">🛡️</span>
                    <h3 className="text-base font-bold mb-1 text-foreground">Không có tranh chấp cần giải quyết</h3>
                    <p className="text-xs text-text-muted">
                      Hệ thống ghi nhận tỷ lệ hài lòng cao, không có đơn hàng nào bị đánh giá từ 1 đến 2 sao kèm khiếu nại.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {disputes.map((rat) => {
                      const rater = userMap.get(rat.rater_id);
                      const worker = userMap.get(rat.rated_user_id);
                      const job = jobMap.get(rat.job_id);
                      return (
                        <div key={rat.id} className="rounded-2xl border border-border-color bg-card-bg p-6 shadow-card flex flex-col justify-between border-l-4 border-l-amber-500">
                          <div>
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <div>
                                <h4 className="text-base font-bold text-foreground">Công việc: {job?.title || 'Công việc đã xóa'}</h4>
                                <span className="text-[10px] text-text-muted block">Ngân sách dự án: {job ? `${job.price.toLocaleString('vi-VN')}₫` : '0đ'}</span>
                              </div>
                              <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-extrabold text-rose-500">
                                ⭐ {rat.stars} sao
                              </span>
                            </div>

                            <div className="h-px bg-border-color my-3" />

                            <div className="text-xs text-text-muted space-y-2 mb-4 text-left">
                              <p>👤 **Nhà tuyển dụng (Người khiếu nại):** <strong className="text-foreground">{rater?.name || 'Sinh viên'}</strong> ({rater?.email})</p>
                              <p>🛠️ **Freelancer Sinh viên (Người bị khiếu nại):** <strong className="text-foreground">{worker?.name || 'Sinh viên'}</strong> ({worker?.email})</p>
                              <p>🕒 **Thời gian đánh giá:** {new Date(rat.created_at).toLocaleDateString('vi-VN')}</p>
                            </div>

                            {rat.proof_image_url ? (
                              <div className="rounded-xl overflow-hidden border border-border-color bg-background p-2 mb-4">
                                <span className="block text-[8px] font-black uppercase text-text-muted mb-1.5">Ảnh minh chứng tranh chấp / vi phạm (Proof of Dispute):</span>
                                <a href={rat.proof_image_url} target="_blank" rel="noreferrer" className="block relative group">
                                  <img
                                    src={rat.proof_image_url}
                                    alt="Minh chứng tranh chấp"
                                    className="w-full h-44 object-cover rounded-lg bg-slate-900 border border-border-color group-hover:opacity-85 transition-opacity"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                                    🔍 Xem ảnh gốc kích thước đầy đủ
                                  </div>
                                </a>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-rose-500/20 py-4 text-center text-xs text-rose-500 bg-rose-500/5 mb-4">
                                ⚠️ Cảnh báo: Người dùng không cung cấp ảnh chụp minh chứng vi phạm!
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 border-t border-border-color pt-4">
                            <button
                              onClick={() => alert('Giải quyết tranh chấp: Hệ thống đã ghi nhận kiểm duyệt của quản trị viên và sẽ giữ nguyên hoặc khôi phục uy tín sau khi thương lượng.')}
                              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-98 shadow-md"
                            >
                              ✓ Xác nhận & Đóng khiếu nại
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
