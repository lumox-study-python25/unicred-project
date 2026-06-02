'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function ProfilePage() {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  
  // Local Form states
  const [name, setName] = useState('');
  const [major, setMajor] = useState('');
  const [bio, setBio] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-populate fields on load
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setMajor(profile.major || '');
      setBio(profile.bio || '');
      setFacebookUrl(profile.facebook_url || '');
      setInstagramUrl(profile.instagram_url || '');
    }
  }, [profile]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-text-muted">Đang đồng bộ hồ sơ...</span>
        </div>
      </div>
    );
  }

  // Handle avatar file uploads
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    setUploadingAvatar(true);

    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('unicred-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('unicred-media')
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      // Update avatar_url in users database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setSuccessMsg('Đã cập nhật ảnh đại diện thành công!');
      await refreshProfile();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi tải lên ảnh đại diện.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Form Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!name.trim()) return setErrorMsg('Vui lòng nhập tên hiển thị.');
    if (!major.trim()) return setErrorMsg('Vui lòng nhập chuyên ngành đào tạo.');

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          major: major.trim(),
          bio: bio.trim(),
          facebook_url: facebookUrl.trim(),
          instagram_url: instagramUrl.trim(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccessMsg('Đã lưu thông tin hồ sơ thành công!');
      await refreshProfile();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi lưu thông tin hồ sơ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reputation = profile.reputation ?? 100;
  const userLevel = Math.max(1, Math.min(10, Math.floor(reputation / 100)));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation back to dashboard */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-500 font-bold mb-6">
          ← Quay lại Bảng tin việc làm
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Avatar box & Stats card */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="rounded-2xl border border-border-color bg-card-bg p-6 text-center shadow-card">
              
              {/* Profile image picker */}
              <div className="relative mx-auto w-24 h-24 mb-4 group">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-24 h-24 rounded-2xl object-cover border border-border-color shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-lg">
                    {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'SV'}
                  </div>
                )}
                
                {/* Upload overlay hover trigger */}
                <label
                  htmlFor="avatar-input"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-[10px] font-black uppercase text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-indigo-500/40"
                >
                  {uploadingAvatar ? 'Đang tải...' : 'Thay ảnh'}
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>

              <h2 className="text-lg font-bold text-foreground truncate">{profile.name || 'Sinh Viên'}</h2>
              <span className="text-[10px] text-text-muted block truncate mb-4">{profile.email}</span>

              {/* Verified badge indicators */}
              {profile.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  ✓ Sinh viên đã xác thực
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  ⚠️ Đang đợi duyệt thẻ
                </span>
              )}

              <div className="h-px bg-border-color w-full my-4" />

              {/* Stats detail grid */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-background rounded-xl p-2.5 border border-border-color">
                  <span className="block text-[9px] font-black uppercase text-text-muted mb-0.5">Uy tín</span>
                  <span className="font-extrabold text-amber-500 text-sm">⭐ {reputation}</span>
                </div>
                <div className="bg-background rounded-xl p-2.5 border border-border-color">
                  <span className="block text-[9px] font-black uppercase text-text-muted mb-0.5">Cấp độ</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-500 text-sm">Lv.{userLevel}</span>
                </div>
              </div>
            </div>

            {/* Profile guide box */}
            <div className="rounded-2xl border border-border-color bg-card-bg/40 p-4 text-xs text-text-muted">
              💡 <strong>Mẹo:</strong> Hãy điền đầy đủ chuyên ngành đào tạo và tài khoản mạng xã hội để tăng mức độ tin tưởng đối với các nhà tuyển dụng khi đăng ký ứng tuyển việc làm!
            </div>
          </div>

          {/* RIGHT: Form editor (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-border-color bg-card-bg p-6 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-1">Cài đặt hồ sơ cá nhân</h3>
            <p className="text-xs text-text-muted mb-6">
              Cập nhật thông tin chi tiết để peers/employers nhận dạng khi giao dịch.
            </p>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-500">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-650 dark:text-emerald-500">
                ✓ {successMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* School (Locked) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                  Trường Đại học (Khóa)
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.university || 'Đại học'}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl px-4 py-3 text-slate-400 dark:text-slate-500 text-sm cursor-not-allowed"
                />
              </div>

              {/* Major & Display Name Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Display Name */}
                <div>
                  <label htmlFor="display-name" className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                    Tên hiển thị
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    required
                    placeholder="Nhập tên hiển thị của bạn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full form-input rounded-xl px-4 py-3 text-sm"
                  />
                </div>

                {/* Major */}
                <div>
                  <label htmlFor="major" className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                    Chuyên ngành học
                  </label>
                  <input
                    id="major"
                    type="text"
                    required
                    placeholder="Ví dụ: Khoa học máy tính"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full form-input rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>

              {/* Bio description */}
              <div>
                <label htmlFor="bio" className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                  Giới thiệu bản thân
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  placeholder="Chia sẻ ngắn gọn kinh nghiệm lập trình, thiết kế hoặc thế mạnh của bạn..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full form-input rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>

              {/* Social links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facebook URL */}
                <div>
                  <label htmlFor="facebook-link" className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                    Link Facebook cá nhân
                  </label>
                  <input
                    id="facebook-link"
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full form-input rounded-xl px-4 py-3 text-sm"
                  />
                </div>

                {/* Instagram URL */}
                <div>
                  <label htmlFor="instagram-link" className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                    Link Instagram cá nhân
                  </label>
                  <input
                    id="instagram-link"
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full form-input rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>

              {/* Submit Save */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 cursor-pointer mt-6 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-white" />
                    Đang đồng bộ thay đổi...
                  </>
                ) : (
                  'Lưu cài đặt hồ sơ'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
