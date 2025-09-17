import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { userService } from "../services/database";

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
	console.log("🔧 [AuthProvider] Component loaded with enhanced debugging");

	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const profileCreationAttempts = useRef<Set<string>>(new Set());

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			console.log("🔧 [AuthContext] Initial session:", session?.user?.email);
			setSession(session);
			setUser(session?.user ?? null);
			if (
				session?.user &&
				!profileCreationAttempts.current.has(session.user.id)
			) {
				console.log(
					"🔧 [AuthContext] Initial session - calling ensureUserProfile"
				);
				profileCreationAttempts.current.add(session.user.id);
				ensureUserProfile(session.user);
			}
			setLoading(false);
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log("🔧 [AuthContext] Auth event:", event, session?.user?.email);
			console.log(
				"🔧 [AuthContext] Current attempts:",
				Array.from(profileCreationAttempts.current)
			);
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);

			// Handle user authentication events - focus on SIGNED_IN since that's what we're getting
			if (event === "SIGNED_IN" && session?.user) {
				console.log(
					"🔧 [AuthContext] Processing SIGNED_IN event for:",
					session.user.email
				);

				// Prevent duplicate profile creation attempts for the same user
				if (!profileCreationAttempts.current.has(session.user.id)) {
					console.log(
						"🔧 [AuthContext] Adding user to attempts and calling ensureUserProfile"
					);
					profileCreationAttempts.current.add(session.user.id);

					// Ensure user profile exists in our database
					await ensureUserProfile(session.user);
				} else {
					console.log(
						"🔧 [AuthContext] Skipping duplicate profile creation for:",
						session.user.email
					);
				}

				// Clear any OAuth-related URL fragments
				if (window.location.hash.includes("access_token")) {
					window.history.replaceState(null, "", window.location.pathname);
				}
			}

			// Handle sign out event
			if (event === "SIGNED_OUT") {
				console.log(
					"🔧 [AuthContext] SIGNED_OUT event - clearing user and session state"
				);
				setUser(null);
				setSession(null);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	// Ensure user profile exists in our database
	const ensureUserProfile = async (user: User) => {
		try {
			console.log(
				"🔧 [ensureUserProfile] Starting for:",
				user.email,
				"User ID:",
				user.id
			);

			// Check if user profile exists
			const existingProfile = await userService.getProfile(user.id);

			if (!existingProfile) {
				console.log(
					"🔧 [ensureUserProfile] No profile found, creating new one..."
				);

				// Create user profile
				const name =
					user.user_metadata?.name ||
					user.user_metadata?.full_name ||
					user.email?.split("@")[0] ||
					"User";

				const profileData = {
					id: user.id,
					email: user.email!,
					name: name,
					avatar_url: user.user_metadata?.avatar_url || null,
				};

				console.log(
					"🔧 [ensureUserProfile] Creating profile with data:",
					profileData
				);
				const createdProfile = await userService.createProfile(profileData);
				console.log(
					"🔧 [ensureUserProfile] Successfully created:",
					createdProfile
				);
			} else {
				console.log(
					"🔧 [ensureUserProfile] Profile already exists for:",
					user.email
				);
			}
		} catch (error) {
			console.error("🔧 [ensureUserProfile] Failed:", error);

			// Let's also log the full error details
			if (error && typeof error === "object") {
				console.error("🔧 [ensureUserProfile] Error details:", {
					message: error.message,
					code: error.code,
					details: error.details,
					hint: error.hint,
					stack: error.stack,
				});
			}

			// If it's a constraint violation (user already exists), that's actually OK
			if (error?.code === "23505") {
				// unique_violation
				console.log(
					"🔧 [ensureUserProfile] User already exists (constraint violation), ignoring..."
				);
				return;
			}

			// Don't throw the error to avoid breaking the auth flow
		}
	};

	const signIn = async (email: string, password: string) => {
		const result = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return result;
	};

	const signUp = async (email: string, password: string, metadata?: object) => {
		console.log("🔧 [signUp] Starting signup for:", email);

		const result = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: metadata,
			},
		});

		console.log(
			"🔧 [signUp] Signup result:",
			result.data.user ? "Success" : "Failed",
			result.error?.message || ""
		);

		// Don't create profile here - let the auth state change handle it
		// This prevents duplicate creation attempts

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
		setUser(null);
		setSession(null);
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
