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
        .maybeSingle();
      
      if (error) {
        console.error('[Auth Error] Lỗi khi truy vấn hồ sơ từ bảng public.users:', error);
        throw error;
      }
      
      if (!data) {
        console.warn(`[Auth] Không tìm thấy hồ sơ cho UID ${uid} trong bảng public.users. Đang tiến hành tự động khởi tạo...`);
        
        // Retrieve current authenticated user session details to fallback
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userEmail = currentUser?.email || '';
        
        const fallbackProfile = {
          id: uid,
          email: userEmail,
          name: userEmail ? userEmail.split('@')[0] : 'Sinh Viên',
          university: 'Đại học Bách Khoa Hà Nội (HUST)',
          major: 'Chưa cập nhật',
          credits: 500000,
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
          .maybeSingle();

        if (insertError) {
          console.error('[Auth Error] Tự động tạo hồ sơ thất bại:', insertError);
          // Set local fallback state so UI doesn't hang
          setProfile(fallbackProfile as UserProfile);
        } else if (newProfile) {
          console.log('[Auth] Hồ sơ tự động khởi tạo thành công:', newProfile);
          setProfile(newProfile as UserProfile);
        } else {
          setProfile(fallbackProfile as UserProfile);
        }
      } else {
        console.log('[Auth] Tải hồ sơ người dùng thành công:', data);
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('[Auth Exception] Lỗi ngoại lệ trong fetchProfile:', err);
      // Fail-safe default profile so UI never gets stuck in infinite loading spinner
      setProfile({
        id: uid,
        email: '',
        name: 'Sinh Viên',
        university: 'Đại học',
        major: 'Chưa cập nhật',
        credits: 500000,
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

  useEffect(() => {
    // 1. Check active session on load with robust error handling for invalid refresh tokens
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth Error] Lỗi kiểm tra phiên đăng nhập (có thể do Token Refresh hết hạn):', JSON.stringify(error, null, 2));
        try {
          await supabase.auth.signOut();
        } catch (soErr) {
          console.error('[Auth] Lỗi khi cố gắng signOut dọn dẹp token:', soErr);
        }
        setUser(null);
        setProfile(null);
      } else {
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        if (activeUser) {
          await fetchProfile(activeUser.id);
        }
      }
      setLoading(false);
    }).catch(async (err) => {
      console.error('[Auth Exception] Lỗi ngoại lệ getSession:', JSON.stringify(err, null, 2));
      try {
        await supabase.auth.signOut();
      } catch (soErr) {
        console.error('[Auth] Lỗi khi cố gắng signOut dọn dẹp token:', soErr);
      }
      setUser(null);
      setProfile(null);
      setLoading(false);
    });

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
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error during signOut:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
