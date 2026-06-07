'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  university: string | null;
  major: string | null;
  bio: string | null;
  avatar_url: string | null;
  credits: number;
  trust_score: number;
  freelancer_reputation: number;
  client_reputation: number;
  reputation: number;
  is_verified: boolean;
  student_card_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  role: 'user' | 'admin';
  is_banned: boolean;
  flagged_reason: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async (uid: string) => {
    try {
      console.log(`[Auth] Đang tải hồ sơ sinh viên cho UID: ${uid}`);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (error || !data) {
        console.log("Profile not found, creating automatically");
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userEmail = currentUser?.email || '';
        
        const fallbackProfile = {
          id: uid,
          email: userEmail,
          name: userEmail ? userEmail.split('@')[0] : 'Sinh Viên',
          university: 'Đại học Bách Khoa Hà Nội (HUST)',
          major: 'Chưa cập nhật',
          credits: 100,
          trust_score: 0,
          freelancer_reputation: 100,
          client_reputation: 100,
          reputation: 100,
          is_verified: false,
          avatar_url: null,
          bio: null,
          student_card_url: null,
          facebook_url: null,
          instagram_url: null,
          role: 'user' as const,
          is_banned: false,
          flagged_reason: null,
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert([fallbackProfile])
          .select()
          .single();

        if (insertError) {
          console.error('[Auth Error] Tự động tạo hồ sơ thất bại:', insertError);
          setProfile(fallbackProfile as UserProfile);
        } else {
          setProfile(newProfile as UserProfile);
        }
      } else {
        console.log('[Auth] Tải hồ sơ người dùng thành công:', data);
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('[Auth Exception] Lỗi ngoại lệ trong fetchProfile:', err);
      // NEVER block UI waiting for profile, always set loading = false even on error
      setProfile({
        id: uid,
        email: '',
        name: 'Sinh Viên',
        university: 'Đại học',
        major: 'Chưa cập nhật',
        credits: 100,
        trust_score: 0,
        freelancer_reputation: 100,
        client_reputation: 100,
        reputation: 100,
        is_verified: false,
        avatar_url: null,
        bio: null,
        student_card_url: null,
        facebook_url: null,
        instagram_url: null,
        role: 'user',
        is_banned: false,
        flagged_reason: null,
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const initUser = async () => {
    try {
      setLoading(true);
      // 1. Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log("No active session or session error, redirecting to login");
        setUser(null);
        setProfile(null);
        setLoading(false);
        // Force redirect to login immediately if we are not on an auth route
        const isAuthRoute = window.location.pathname === '/login' || window.location.pathname === '/signup';
        if (!isAuthRoute) {
          window.location.href = "/login";
        }
        return;
      }

      const activeUser = session.user;
      setUser(activeUser);

      // 2. Fetch profile from users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', activeUser.id)
        .single();

      if (error || !data) {
        console.log("Profile not found, creating profile automatically");
        const userEmail = activeUser.email || '';
        
        const fallbackProfile = {
          id: activeUser.id,
          email: userEmail,
          name: userEmail ? userEmail.split('@')[0] : 'Sinh Viên',
          university: 'Đại học Bách Khoa Hà Nội (HUST)',
          major: 'Chưa cập nhật',
          credits: 100,
          trust_score: 0,
          freelancer_reputation: 100,
          client_reputation: 100,
          reputation: 100,
          is_verified: false,
          avatar_url: null,
          bio: null,
          student_card_url: null,
          facebook_url: null,
          instagram_url: null,
          role: 'user' as const,
          is_banned: false,
          flagged_reason: null,
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert([fallbackProfile])
          .select()
          .single();

        if (insertError) {
          console.error('[Auth Error] Tự động tạo hồ sơ thất bại:', insertError);
          setProfile(fallbackProfile as UserProfile);
        } else {
          setProfile(newProfile as UserProfile);
        }
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('[Auth Exception] Lỗi trong initUser:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initUser();

    // 2. Listen to active auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth Event] Sự kiện Auth thay đổi: ${event}`);
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      
      if (activeUser) {
        await fetchProfile(activeUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);

      if (event === 'SIGNED_IN') {
        router.push('/');
      } else if (event === 'SIGNED_OUT') {
        // Handled by signOut redirect
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Client-side Route protections
  useEffect(() => {
    if (loading) return;
    const isAuthRoute = pathname === '/login' || pathname === '/signup';
    
    if (!user && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
      router.push('/');
    }
  }, [user, pathname, loading, router]);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      localStorage.clear();
      setUser(null);
      setProfile(null);
      window.location.href = "/login";
    } catch (err) {
      console.error('Error during signOut:', err);
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm font-semibold text-text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
