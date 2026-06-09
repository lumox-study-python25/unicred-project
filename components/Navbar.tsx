'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Navbar() {
  const { profile, loading, signOut } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notiDropdownOpen, setNotiDropdownOpen] = useState(false);

  // Initialize theme from localStorage on load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme as 'light' | 'dark');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Fetch unread notifications
  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('[Notifications] Lỗi khi nạp thông báo:', err);
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT (new notification) and UPDATE (marked as read)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedNoti = payload.new;
            if (updatedNoti.is_read) {
              setNotifications((prev) => prev.filter((n) => n.id !== updatedNoti.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Request browser notification permissions on mount if not already granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle notification click: mark as read and open chat conversation
  const handleNotificationClick = async (noti: any) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', noti.id);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== noti.id));

      if (noti.conversation_id) {
        window.location.href = `/?chat=${noti.conversation_id}`;
      }
    } catch (err) {
      console.error('[Notifications] Lỗi xử lý click thông báo:', err);
    }
  };

  // Toggle Dark/Light mode
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Compute Gamified Level: Lv. 1 up to Lv. 10
  const credits = profile?.credits ?? 100;
  const userLevel = Math.max(1, Math.min(10, Math.floor(credits / 100)));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo Link to Dashboard */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="relative">
            <div className="absolute -inset-1 animate-pulse rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-70 blur-md transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xl font-black text-white shadow-xl">
              U
            </div>
          </div>
          <span className="ml-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-2xl font-black tracking-wider text-transparent">
            UniCred
          </span>
          <span className="hidden rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-500 sm:inline-block">
            Sinh Viên
          </span>
        </Link>

        {/* Right Nav Options - Căn giữa trục dọc và cách đều */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Theme Toggle Button (Cố định 40x40px, ép tâm tuyệt đối) */}
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50"
            aria-label="Toggle Theme"
          >
            <span className="flex items-center justify-center leading-none text-base">
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
          </button>

          {profile && (
            <>
              {/* Trust Score & Level (Căn giữa tuyệt đối chữ và icon) */}
              <div className="hidden sm:flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-amber-200/50 bg-amber-50/60 px-3.5 shadow-sm">
                <span className="flex items-center justify-center text-sm leading-none">⭐</span>
                <span className="flex items-center justify-center pt-[1px] text-[10px] font-bold uppercase tracking-wider text-amber-700/70 leading-none">
                  Trust:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center text-sm font-black text-amber-600 leading-none">
                    {profile.trust_score ?? 0}
                  </span>
                  <span className="flex items-center justify-center rounded-full border border-amber-200 bg-amber-100 px-1.5 py-[3px] text-[9px] font-black text-amber-700 shadow-sm leading-none">
                    Cấp {userLevel}
                  </span>
                </div>
              </div>

              {/* Credits Balance (Căn giữa tuyệt đối chữ và icon) */}
              <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200/50 bg-emerald-50/60 px-3.5 shadow-sm">
                <span className="flex items-center justify-center text-sm leading-none">🪙</span>
                <span className="hidden md:flex items-center justify-center pt-[1px] text-[10px] font-bold uppercase tracking-wider text-emerald-700/70 leading-none">
                  Số dư:
                </span>
                <div className="flex items-center gap-1 leading-none">
                  <span className="flex items-center justify-center text-sm font-black tracking-wide text-emerald-600 leading-none">
                    {credits}
                  </span>
                  <span className="flex items-center justify-center pt-[1px] text-[10px] font-bold text-emerald-600 leading-none">
                    credits
                  </span>
                </div>
              </div>

              {/* Notification Bell Dropdown (Cố định 40x40px) */}
              <div className="relative">
                <button
                  onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
                  className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 focus:outline-none"
                  aria-label="Notifications"
                >
                  <span className="flex items-center justify-center leading-none text-base">🔔</span>
                  {notifications.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-md">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Menu */}
                {notiDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotiDropdownOpen(false)} />
                    <div className="absolute right-0 top-12 z-20 max-h-96 w-72 animate-fade-in overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                        <span className="block text-xs font-black text-slate-900 dark:text-slate-100">
                          Thông báo tin nhắn ({notifications.length})
                        </span>
                      </div>
                      
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs italic text-slate-400">
                          Không có thông báo mới nào
                        </div>
                      ) : (
                        notifications.map((noti) => (
                          <button
                            key={noti.id}
                            onClick={() => {
                              setNotiDropdownOpen(false);
                              handleNotificationClick(noti);
                            }}
                            className="mt-1 flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border border-transparent px-3 py-2.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <span className="block w-full truncate font-bold text-slate-800 dark:text-slate-100">
                              📩 {noti.content}
                            </span>
                            <span className="block text-[9px] font-bold text-slate-400">
                              {new Date(noti.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Profile Avatar Dropdown (Cố định 40x40px) */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/60 bg-white p-0.5 shadow-sm transition-all hover:bg-slate-50 focus:outline-none"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-full w-full rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white shadow-md shadow-indigo-500/20">
                      {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'SV'}
                    </div>
                  )}
                  {/* Verified Student Badge */}
                  {profile.is_verified ? (
                    <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[9px] font-bold text-white shadow-sm" title="Sinh viên đã xác thực">
                      ✓
                    </span>
                  ) : (
                    <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-500 text-[9px] font-bold text-white shadow-sm" title="Đang chờ xác thực">
                      ?
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-12 z-20 w-52 animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                        <span className="block truncate text-xs font-black text-slate-800 dark:text-slate-100">
                          {profile.name || 'Sinh Viên'}
                        </span>
                        <span className="block truncate text-[10px] text-slate-500">
                          {profile.email}
                        </span>
                      </div>
                      
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        👤 Hồ sơ cá nhân
                      </Link>

                      {profile.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                        >
                          🛡️ Quản trị Admin
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="mt-1 flex w-full cursor-pointer items-center gap-2 text-left rounded-xl px-3 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        🚪 Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}