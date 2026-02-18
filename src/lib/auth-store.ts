import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, AuthUser, Profile } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthStore extends AuthState {
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!user,
          isLoading: state.isLoading,
        })),
      setSession: (session) =>
        set({
          session: session as AuthState['session'],
          user: session?.user as AuthUser | null,
          isAuthenticated: !!session,
        }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set(initialState),
    }),
    {
      name: 'nanumauth-auth',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);
