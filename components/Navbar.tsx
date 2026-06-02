'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function Navbar() {
  const { profile, loading, signOut } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
  const reputation = profile?.reputation ?? 100;
  const userLevel = Math.max(1, Math.min(10, Math.floor(reputation / 100)));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-color bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo Link to Dashboard */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-70 blur-md transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-xl font-black text-white shadow-xl">
              U
            </div>
          </div>
          <span className="ml-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-2xl font-black tracking-wider text-transparent">
            UniCred
          </span>
          <span className="hidden sm:inline-block rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-400">
            Sinh Viên
          </span>
        </Link>

        {/* Right Nav Options */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-border-color bg-card-bg text-foreground hover:bg-border-color transition-colors shadow-sm cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {profile && (
            <>
              {/* Reputation & Level */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3.5 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.04)]">
                <span className="text-xs">⭐</span>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Uy tín:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-amber-500">{reputation}</span>
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[8px] font-black text-amber-400">
                    Cấp {userLevel}
                  </span>
                </div>
              </div>

              {/* VND Credit Balance */}
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.04)]">
                <span className="text-xs">💰</span>
                <span className="hidden md:inline text-[10px] text-text-muted font-bold uppercase tracking-wider">Số dư:</span>
                <span className="text-xs sm:text-sm font-black text-emerald-500 tracking-wide">
                  {(profile.credits ?? 0).toLocaleString('vi-VN')}₫
                </span>
              </div>

              {/* Profile Avatar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 border border-border-color rounded-xl p-1 bg-card-bg hover:bg-border-color transition-all cursor-pointer focus:outline-none"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-lg object-cover shadow-sm border border-slate-700/20"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-black text-white">
                      {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'SV'}
                    </div>
                  )}
                  {/* Verified Student Badge */}
                  {profile.is_verified ? (
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 border-2 border-slate-950 text-[8px] text-white font-bold" title="Sinh viên đã xác thực">
                      ✓
                    </span>
                  ) : (
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-600 border-2 border-slate-950 text-[8px] text-white font-bold" title="Đang chờ xác thực">
                      ?
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2.5 w-52 z-20 rounded-2xl border border-border-color bg-card-bg p-2 shadow-2xl animate-fade-in">
                      <div className="px-3.5 py-2.5 border-b border-border-color">
                        <span className="block text-xs font-black text-foreground truncate">
                          {profile.name || 'Sinh Viên'}
                        </span>
                        <span className="block text-[10px] text-text-muted truncate">
                          {profile.email}
                        </span>
                      </div>
                      
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-border-color transition-colors mt-1"
                      >
                        👤 Hồ sơ cá nhân
                      </Link>

                      {profile.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors mt-1"
                        >
                          🛡️ Quản trị Admin
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors mt-1 text-left cursor-pointer"
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
