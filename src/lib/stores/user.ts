import { writable, get } from 'svelte/store';
import NDK, { NDKEvent, NDKUser, NDKKind } from '@nostr-dev-kit/ndk';
import { DEFAULT_RELAYS, getNdkWithSigner, ndk } from '$lib/nostr/ndk';

export interface UserProfile {
    pubkey: string;
    name?: string;
    picture?: string;
    about?: string;
    npub?: string;
    following: Set<string>;
    relays: Set<string>;
}

export const user = writable<UserProfile | null>(null);

// Local storage cache keys
const USER_CACHE_KEY = 'nostr-follow-list:user';
const PROFILE_CACHE_PREFIX = 'nostr-follow-list:profile:';

// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[User Store]', ...args);
};


/**
 * Check if a NIP-07 extension is available in the browser
 */
export async function checkNip07Extension(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return !!(window as any).nostr;
}

/**
 * Load the user profile from the extension and set it in the store
 */
export async function loadUser(): Promise<void> {
    try {
        // Check if we have a cached user profile
        const cachedUser = localStorage.getItem(USER_CACHE_KEY);
        if (cachedUser) {
            user.set(JSON.parse(cachedUser));
        }

        // Make sure we have access to the extension
        if (!(await checkNip07Extension())) {
            throw new Error('NIP-07 extension not found');
        }

        // Get user public key from extension
        const pubkey = await (window as any).nostr.getPublicKey();
        if (!pubkey) {
            throw new Error('Failed to get public key from extension');
        }

        // Fetch the user metadata and following list
        const ndkUser = ndk.getUser({ pubkey });
        await ndkUser.fetchProfile();

        // Create our user object
        const userProfile: UserProfile = {
            pubkey,
            name: ndkUser.profile?.name,
            picture: ndkUser.profile?.picture,
            about: ndkUser.profile?.about,
            npub: ndkUser.npub,
            following: new Set<string>(),
            relays: new Set<string>(DEFAULT_RELAYS)
        };

        // Get the user's follow list (NIP-02)
        const filter = { kinds: [NDKKind.Contacts], authors: [pubkey] };
        const followListEvents = await ndk.fetchEvents(filter);

        for (const event of followListEvents) {
            const pTags = event.tags.filter(tag => tag[0] === 'p');
            for (const tag of pTags) {
                if (tag[1] && typeof tag[1] === 'string') {
                    userProfile.following.add(tag[1]);
                }
            }
        }

        // Get the user's kind 10002 relays and add them to the list of relays
        const relaysFilter = { kinds: [NDKKind.RelayList], authors: [pubkey] };
        const relaysEvents = await ndk.fetchEvents(relaysFilter);
        for (const event of relaysEvents) {
            if (event.tags.length > 0) {
                userProfile.relays.add(event.tags[0][1]);
            }
        }
        // Save the user profile to the store and cache
        user.set(userProfile);

        // Stringify with custom replacer for Set
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userProfile, (key, value) => {
            if (value instanceof Set) {
                return Array.from(value);
            }
            return value;
        }));
    } catch (error) {
        console.error('Error loading user:', error);
        user.set(null);
    }
}

/**
 * Get profile data for a given public key
 */
export async function getProfileByPubkey(pubkey: string): Promise<{ name?: string, picture?: string }> {
    // Check local cache first
    const cacheKey = PROFILE_CACHE_PREFIX + pubkey;
    const cachedProfile = localStorage.getItem(cacheKey);

    // If we have a cached profile and it's less than 24 hours old, use it
    if (cachedProfile) {
        const { data, timestamp } = JSON.parse(cachedProfile);
        const oneDay = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < oneDay) {
            return data;
        }
    }

    // If no valid cache, fetch from relays
    try {
        const ndkUser = ndk.getUser({ pubkey });
        await ndkUser.fetchProfile();

        const profile = {
            name: ndkUser.profile?.name,
            picture: ndkUser.profile?.picture
        };

        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
            data: profile,
            timestamp: Date.now()
        }));

        return profile;
    } catch (error) {
        console.error(`Error fetching profile for ${pubkey}:`, error);
        return {};
    }
}

/**
 * Follow a user by adding them to the current user's contact list
 */
export async function followUser(pubkeyToFollow: string): Promise<boolean> {
    try {
        const signerNdk = await getNdkWithSigner();

        // Get the current user data
        const currentUser = get(user);
        if (!currentUser) throw new Error('No logged in user');

        // Create an updated follow list
        const event = new NDKEvent(signerNdk);
        event.kind = NDKKind.Contacts;

        // Add all existing follows as p tags
        for (const pubkey of currentUser.following) {
            event.tags.push(['p', pubkey]);
        }

        // Add the new pubkey if not already following
        if (!currentUser.following.has(pubkeyToFollow)) {
            event.tags.push(['p', pubkeyToFollow]);
            currentUser.following.add(pubkeyToFollow);
        }

        // Sign with the extension
        await event.sign();

        // Publish to relays
        // await event.publish();

        // Publish to each relay individually
        for (const relayUrl of DEFAULT_RELAYS) {
            try {
                const relay = await signerNdk.pool.getRelay(relayUrl);
                await relay.publish(event);
                logDebug(`Published to ${relayUrl}`);
            } catch (err) {
                logDebug(`Failed to publish to ${relayUrl}:`, err);
            }
        }

        // Update the store
        user.set(currentUser);

        // Update cache
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(currentUser, (key, value) => {
            if (value instanceof Set) {
                return Array.from(value);
            }
            return value;
        }));

        return true;
    } catch (error) {
        console.error('Error following user:', error);
        return false;
    }
} 