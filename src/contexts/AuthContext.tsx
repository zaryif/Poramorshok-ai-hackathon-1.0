import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";

interface AuthContextType {
	user: User | null;
	session: Session | null;
	loading: boolean;
	signIn: (
		email: string,
		password: string
	) => Promise<{ data: any; error: AuthError | null }>;
	signUp: (
		email: string,
		password: string,
		metadata?: object
	) => Promise<{ data: any; error: AuthError | null }>;
	signInWithGoogle: () => Promise<{ data: any; error: AuthError | null }>;
	signOut: () => Promise<{ error: AuthError | null }>;
	resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
	updateProfile: (updates: any) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log("Auth event:", event, session?.user?.email);
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);

			// Handle OAuth redirect
			if (event === "SIGNED_IN" && session) {
				// Clear any OAuth-related URL fragments
				if (window.location.hash.includes("access_token")) {
					window.history.replaceState(null, "", window.location.pathname);
				}
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const signIn = async (email: string, password: string) => {
		const result = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return result;
	};

	const signUp = async (email: string, password: string, metadata?: object) => {
		const result = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: metadata,
			},
		});
		return result;
	};

	const signInWithGoogle = async () => {
		// Get the current origin (should be http://localhost:5173 in dev)
		const currentOrigin = window.location.origin;
		console.log("OAuth redirect URL:", currentOrigin);

		const result = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: currentOrigin,
			},
		});
		return result;
	};

	const signOut = async () => {
		const result = await supabase.auth.signOut();
		return result;
	};

	const resetPassword = async (email: string) => {
		const result = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		return result;
	};

	const updateProfile = async (updates: any) => {
		const result = await supabase.auth.updateUser({
			data: updates,
		});
		return result;
	};

	const value = {
		user,
		session,
		loading,
		signIn,
		signUp,
		signInWithGoogle,
		signOut,
		resetPassword,
		updateProfile,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
