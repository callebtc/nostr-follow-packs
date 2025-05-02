import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { user } from '$lib/stores/user';
import { logout as logoutFromStore } from '$lib/stores/login';

/**
 * Logout Service
 * 
 * This service centralizes the logout logic for the application, ensuring that:
 * 1. The login state is cleared from the login store
 * 2. The user data is cleared from the user store
 * 3. All related localStorage data is removed
 * 4. The user is redirected to the home page (optional)
 * 
 * By centralizing this logic, we ensure consistent logout behavior across the application
 * and make it easier to maintain and extend the logout process.
 */

// Local storage key constants - must match those in user.ts
const USER_CACHE_KEY = 'nostr-follow-list:user';
const PROFILE_CACHE_PREFIX = 'nostr-follow-list:profile:';
const FOLLOW_SNAPSHOTS_KEY = 'nostr-follow-list:snapshots';

/**
 * Completely log out the user, clearing all stored data
 * 
 * @param redirectToHome - Whether to redirect to the home page after logout (default: true)
 * @returns A promise that resolves when the logout process is complete
 */
export async function logoutUser(redirectToHome = true): Promise<void> {
    // Call the logout function from login store to clear login state and NDK signer
    logoutFromStore();

    // Clear the user store
    user.set(null);

    // Clear all user-related data from localStorage
    if (browser) {
        // nuke all local storage keys
        localStorage.clear();
    }

    // Redirect to home page if requested
    if (redirectToHome) {
        await goto('/');
        window.location.reload();
    }
} 