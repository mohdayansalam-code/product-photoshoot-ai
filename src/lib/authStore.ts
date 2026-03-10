import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
    session: Session | null;
    user: User | null;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    initialized: false,
    setSession: (session) => set({ session, user: session?.user || null }),
    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({ session, user: session?.user || null, initialized: true });

            // Listen for auth changes anywhere in the app
            supabase.auth.onAuthStateChange((_event, newSession) => {
                set({ session: newSession, user: newSession?.user || null });
            });

        } catch (error) {
            console.error("Failed to initialize auth session", error);
            set({ initialized: true });
        }
    },
    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    }
}));
