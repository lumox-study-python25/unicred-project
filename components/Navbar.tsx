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
          
          {/* Theme Toggle Button (Cố định 42x42px, ép tâm tuyệt đối) */}
          <button
            onClick={toggleTheme}
            className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/60 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50"
            aria-label="Toggle Theme"
          >
            <span className="flex items-center justify-center leading-none text-lg">
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
          </button>

          {profile && (
            <>
              {/* Trust Score (Căn giữa tuyệt đối chữ và icon, h-[42px]) */}
              <div className="hidden sm:flex h-[42px] shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-4 shadow-sm">
                <span className="flex items-center justify-center text-lg leading-none">⭐</span>
                <span className="text-sm font-black text-slate-700 tracking-wide">
                  UY TÍN: <span className="text-amber-500">{profile.trust_score ?? 0}</span>
                </span>
                <span className="ml-1 flex items-center justify-center rounded-full border border-amber-200 bg-amber-100 px-1.5 py-[3px] text-[9px] font-black text-amber-700 shadow-sm leading-none">
                  Cấp {userLevel}
                </span>
              </div>

              {/* Credits Balance (Căn giữa tuyệt đối chữ và icon, h-[42px]) */}
              <div className="flex h-[42px] shrink-0 items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 shadow-sm">
                <span className="flex items-center justify-center text-lg leading-none">🪙</span>
                <span className="text-sm font-black text-slate-700 tracking-wide">
                  CREDITS: <span className="text-indigo-600">{credits}</span>
                </span>
              </div>

              {/* Notification Bell Dropdown (Cố định 42x42px) */}
              <div className="relative">
                <button
                  onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
                  className="relative flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/60 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 focus:outline-none"
                  aria-label="Notifications"
                >
                  <span className="flex items-center justify-center leading-none text-lg">🔔</span>
                  {notifications.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-md">
                      {notifications.length}
