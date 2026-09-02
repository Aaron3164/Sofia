import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Preferences = {
  theme?: 'light' | 'dark' | 'glass';
  ai_personality?: 'benevolent' | 'concise' | 'academic';
  ai_study_mode?: 'understanding' | 'memorization' | 'critical';
  ai_auto_flashcards?: boolean;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'premium';
  premium_until?: string | null;
  preferences: Preferences;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updatePreferences: (prefs: Partial<Preferences>) => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up Supabase Realtime subscription & window focus listener for profile updates
  useEffect(() => {
    if (!user) return;

    // 1. Initial fetch
    fetchProfile(user.id);

    // 2. Realtime listener on public.profiles table
    const profileChannel = supabase
      .channel(`public:profiles:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    // 3. Re-fetch when user returns focus to browser window (e.g. returning from Payhip tab)
    const handleFocus = () => {
      fetchProfile(user.id);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, plan: 'free', preferences: {} }])
          .select()
          .single();
        
        if (!createError) {
          setProfile(newProfile);
          return newProfile;
        }
      } else if (!error && data) {
        // Automatically check and handle subscription expiration
        if (data.plan === 'premium' && data.premium_until) {
          const isExpired = new Date(data.premium_until) < new Date();
          if (isExpired) {
            console.log('Subscription expired. Downgrading to free plan.');
            await supabase
              .from('profiles')
              .update({ plan: 'free' })
              .eq('id', userId);
            
            data.plan = 'free';
          }
        }
        setProfile(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) {
            return prev;
          }
          return data;
        });
        return data;
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function refreshProfile(): Promise<Profile | null> {
    if (!user) return null;
    return await fetchProfile(user.id);
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } else {
      throw error;
    }
  }

  async function updatePreferences(newPrefs: Partial<Preferences>) {
    if (!user || !profile) return;
    
    const updatedPreferences = {
      ...profile.preferences,
      ...newPrefs
    };

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, preferences: updatedPreferences } : null);
    } else {
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signIn, signUp, signOut, updateProfile, updatePreferences, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
