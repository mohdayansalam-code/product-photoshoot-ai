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
    // Handled in UI
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    initialized: false,
    setSession: (session) => set({ session, user: session?.user || null }),
    initialize: async () => {
        try {
            const devSession = localStorage.getItem("photoai-dev-session");

            if (devSession) {
                try {
                    const parsed = JSON.parse(devSession);
                    set({
                        user: parsed.user,
                        session: parsed,
                        initialized: true
                    });
                    return;
                } catch (parseError) {
                    console.error("Corrupted dev session found, clearing...", parseError);
                    localStorage.removeItem("photoai-dev-session");
                }
            }

            // Add a 10-second failsafe timeout to prevent infinite loading if Supabase hangs
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => 
                setTimeout(() => reject(new Error("Supabase auth timeout")), 10000)
            );
            
            const { data } = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null } };
            
            if (data?.session) {
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
