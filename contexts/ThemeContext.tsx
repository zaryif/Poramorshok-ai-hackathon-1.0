import React, { createContext, useState, useEffect, ReactNode, useMemo, useContext, useCallback } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { userService } from '../src/services/database';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    updateThemePreference: (userId: string, theme: Theme) => Promise<void>;
    loadUserThemePreference: (userId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedTheme = window.localStorage.getItem('theme') as Theme | null;
            if (storedTheme) return storedTheme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Load user's theme preference when user logs in
    useEffect(() => {
        if (user) {
            loadUserThemePreference(user.id);
        }
    }, [user]);

    const toggleTheme = useCallback(async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        
        // Update in database if user is authenticated
        if (user) {
            try {
                await updateThemePreference(user.id, newTheme);
            } catch (error) {
                console.error('Failed to update theme preference in database:', error);
            }
        }
    }, [theme, user]);

    const updateThemePreference = useCallback(async (userId: string, newTheme: Theme) => {
        try {
            await userService.updateProfile(userId, { theme_preference: newTheme });
            console.log('Theme preference updated in database:', newTheme);
        } catch (error) {
            console.error('Failed to update theme preference in database:', error);
            throw error;
        }
    }, []);

    const loadUserThemePreference = useCallback(async (userId: string) => {
        try {
            const profile = await userService.getProfile(userId);
            if (profile?.theme_preference && ['light', 'dark'].includes(profile.theme_preference)) {
                setTheme(profile.theme_preference as Theme);
            }
        } catch (error) {
            console.error('Failed to load user theme preference:', error);
        }
    }, []);
    
    const value = useMemo(() => ({ 
        theme, 
        toggleTheme, 
        updateThemePreference, 
        loadUserThemePreference 
    }), [theme, toggleTheme, updateThemePreference, loadUserThemePreference]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
