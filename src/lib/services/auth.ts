import { browser } from '$app/environment';
import { loginState, initializeSigner } from '$lib/stores/login';
import { loadUser, user } from '$lib/stores/user';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Auth Service]', ...args);
};

/**
 * Initialize authentication by restoring login state and loading user
 * This is the primary function to call when the app starts or when a page loads directly
 */
export async function initializeAuth(): Promise<boolean> {
    if (!browser) return false;

    logDebug('Initializing auth');

    try {
        // Check if we're already logged in and have user data
        if (get(loginState).loggedIn && get(user)?.pubkey) {
            logDebug('Already authenticated');
            return true;
        }

        // Initialize signer from saved login state
        const signerInitialized = await initializeSigner();
        logDebug('Signer initialized:', signerInitialized);

        if (!signerInitialized) {
            logDebug('Failed to initialize signer, auth failed');
            return false;
        }

        // Load user profile
        await loadUser();
        const loadedUser = get(user);

        if (!loadedUser) {
            logDebug('Failed to load user profile');
            return false;
        }

        logDebug('Authentication successful:', loadedUser.pubkey);
        return true;
    } catch (error) {
        console.error('Error initializing auth:', error);
        return false;
    }
}

/**
 * Check if the user is currently authenticated
 */
export function isAuthenticated(): boolean {
    return !!get(user)?.pubkey && get(loginState).loggedIn;
}

/**
 * Get the current authenticated user's public key
 */
export function getCurrentUserPubkey(): string | null {
    const currentUser = get(user);
    return currentUser?.pubkey || null;
}

/**
 * Route guard for protected pages
 * Use this in onMount functions for pages that require authentication
 * 
 * @param redirectPath Optional path to redirect to if not authenticated (default: '/')
 * @returns A promise that resolves to true if authenticated, or redirects and returns false
 */
export async function requireAuth(redirectPath: string = '/'): Promise<boolean> {
    if (!browser) return false;

    const isAuthed = await initializeAuth();

    if (!isAuthed) {
        logDebug(`Authentication required, redirecting to ${redirectPath}`);
        await goto(redirectPath);
        return false;
    }

    return true;
}

/**
 * Initialize auth without requiring login
 * Use this for pages that work with or without authentication
 */
export async function initOptionalAuth(): Promise<void> {
    if (browser) {
        await initializeAuth();
    }
} 