'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data as Profile | null;
    },
    [supabase]
  );

  useEffect(() => {
    async function getInitialSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await fetchProfile(user.id);
        setState({ user, profile, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, profile, loading: false });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, profile: null, loading: false });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setState((prev) => ({ ...prev, user: session.user }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
    },
    [supabase]
  );

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    login,
    logout,
    resetPassword,
  };
}
