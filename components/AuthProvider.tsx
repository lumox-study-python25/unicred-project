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
const { data } = await supabase
.from('users')
.select('*')
.eq('id', uid)
.maybeSingle();

```
  if (!data) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const userEmail = currentUser?.email || '';

    const fallbackProfile = {
      id: uid,
      email: userEmail,
      name: userEmail ? userEmail.split('@')[0] : 'Sinh Viên',
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
      role: 'user' as const,
      is_banned: false,
      flagged_reason: null,
    };

    const { data: newProfile } = await supabase
      .from('users')
      .upsert([fallbackProfile], { onConflict: 'id' })
      .select()
      .single();

    setProfile(newProfile as UserProfile);
  } else {
    setProfile(data as UserProfile);
  }
} catch (err) {
  console.error('[Auth Error]', err);
  setProfile(null);
}
```

};

const refreshProfile = async () => {
if (user) await fetchProfile(user.id);
};

useEffect(() => {
const init = async () => {
try {
const { data: { session } } = await supabase.auth.getSession();

```
    if (!session) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(session.user);
    await fetchProfile(session.user.id);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

init();

const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event, session) => {
    const activeUser = session?.user ?? null;
    setUser(activeUser);

    if (activeUser) {
      await fetchProfile(activeUser.id);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }
);

return () => subscription.unsubscribe();
```

}, []);

useEffect(() => {
if (loading) return;

```
const isAuthRoute = pathname === '/login' || pathname === '/signup';

if (!user && !isAuthRoute) {
  router.replace('/login');
} else if (user && isAuthRoute) {
  router.replace('/');
}
```

}, [user, pathname, loading]);

const signOut = async () => {
await supabase.auth.signOut();
setUser(null);
setProfile(null);
router.replace('/login');
};

if (loading) {
return ( <div className="min-h-screen flex items-center justify-center"> <p>Loading...</p> </div>
);
}

return (
<AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
{children}
</AuthContext.Provider>
);
}

export const useAuth = () => useContext(AuthContext);
