"use client";

import { Profile } from "@/types";
import { User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext } from "react";

interface AuthState {
    user: User | null;
    profile: Profile | null;
}

const AuthContext = createContext<AuthState>({ user: null, profile: null });

export function AuthProvider({
    children,
    user,
    profile,
}: {
    children: ReactNode;
    user: User | null;
    profile: Profile | null;
}) {
    return (
        <AuthContext.Provider value={{ user, profile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
