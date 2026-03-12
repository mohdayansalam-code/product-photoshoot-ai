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

const hostname = window.location.hostname;
if (hostname === "127.0.0.1") {
    console.warn("Use localhost instead of 127.0.0.1 for local development to ensure Magic Link redirects work correctly.");
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    initialized: false,
    setSession: (session) => set({ session, user: session?.user || null }),
    initialize: async () => {
        const devSession = localStorage.getItem("photoai-dev-session");

        if (devSession) {
            const parsed = JSON.parse(devSession);
            set({
                user: parsed.user,
                session: parsed,
                initialized: true
            });
            return;
        }

        try {
            const { data } = await supabase.auth.getSession();
            
            if (data.session) {
                set({ 
                    session: data.session, 
                    user: data.session.user, 
                    initialized: true 
                });
            } else {
                set({ initialized: true });
            }

            // Listen for auth changes anywhere in the app
            supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    session,
                    user: session?.user || null
                });
            });

        } catch (error) {
            console.error("Failed to initialize auth session", error);
            set({ initialized: true });
        }
    },
    signOut: async () => {
        localStorage.removeItem("photoai-dev-session");
        await supabase.auth.signOut();
        set({ session: null, user: null });
    }
}));
