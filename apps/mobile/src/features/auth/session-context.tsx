import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { hasIdentityChanged, type KnownUserId } from '@/features/auth/identity-change';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
    session: Session | null;
    /** true tant que la session initiale n'a pas été restaurée depuis le storage */
    isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue>({ session: null, isLoading: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Identité de la session en cours, hors état de rendu : elle sert à décider
    // du vidage du cache AVANT que le nouveau compte ne rende quoi que ce soit.
    const userId = useRef<KnownUserId>(undefined);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            // onAuthStateChange peut avoir déjà livré la session initiale : ne
            // pas la réécrire ici, elle serait potentiellement plus ancienne.
            if (userId.current === undefined) {
                userId.current = data.session?.user.id ?? null;
                setSession(data.session);
            }
            setIsLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            const nextUserId = newSession?.user.id ?? null;
            // Changement de compte (ou déconnexion) : le cache du compte
            // précédent ne doit jamais s'afficher sous les yeux du suivant.
            if (hasIdentityChanged(userId.current, nextUserId)) {
                queryClient.clear();
            }
            userId.current = nextUserId;
            setSession(newSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <SessionContext.Provider value={{ session, isLoading }}>{children}</SessionContext.Provider>
    );
}

export function useSession() {
    return useContext(SessionContext);
}
