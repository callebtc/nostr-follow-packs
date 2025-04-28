import { writable, get } from 'svelte/store';
import NDK, { NDKEvent, NDKUser, NDKKind } from '@nostr-dev-kit/ndk';
import { DEFAULT_RELAYS, getNdkWithSigner, ndk, publishEvent } from '$lib/nostr/ndk';

export interface UserProfile {
    pubkey: string;
    name?: string;
    picture?: string;
    about?: string;
    npub?: string;
    following: Set<string>;
    relays: Set<string>;
}

export interface FollowSnapshot {
    timestamp: number;
    eventId: string;
    count: number;
    pubkeys: string[];
    event: any; // Serialized NDKEvent
}

export const user = writable<UserProfile | null>(null);

// Local storage cache keys
const USER_CACHE_KEY = 'nostr-follow-list:user';
const PROFILE_CACHE_PREFIX = 'nostr-follow-list:profile:';
const FOLLOW_SNAPSHOTS_KEY = 'nostr-follow-list:snapshots';

// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[User Store]', ...args);
};

/**
 * Get stored follow snapshots from localStorage
 */
export function getFollowSnapshots(): FollowSnapshot[] {
    const snapshots = localStorage.getItem(FOLLOW_SNAPSHOTS_KEY);
    if (!snapshots) return [];

    try {
        return JSON.parse(snapshots);
    } catch (err) {
        console.error('Error parsing snapshots:', err);
        return [];
    }
}

/**
 * Add a new follow snapshot to localStorage
 */
function saveFollowSnapshot(event: NDKEvent, pubkeys: string[]) {
    try {
        // Get existing snapshots
        const snapshots = getFollowSnapshots();

        // only if the pubkeys are different from the last snapshot
        if (snapshots.some(snapshot => snapshot.pubkeys.length === pubkeys.length && snapshot.pubkeys.every(pubkey => pubkeys.includes(pubkey)))) {
            return;
        }

        // Create new snapshot
        const newSnapshot: FollowSnapshot = {
            timestamp: Date.now(),
            eventId: event.id,
            count: pubkeys.length,
            pubkeys,
            event: event.rawEvent() // Store serialized event
        };

        // Add to snapshots array (limit to last 20)
        snapshots.unshift(newSnapshot);
        const limitedSnapshots = snapshots.slice(0, 20);

        // Save back to localStorage
        localStorage.setItem(FOLLOW_SNAPSHOTS_KEY, JSON.stringify(limitedSnapshots));
        logDebug('Saved follow snapshot with', pubkeys.length, 'follows');
    } catch (err) {
        console.error('Error saving follow snapshot:', err);
    }
}

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
        // if user is already loaded, return
        if (get(user)) return;

        console.log('Loading user')
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
        const eventsArray = Array.from(followListEvents);

        // Get the most recent event
        if (eventsArray.length > 0) {
            // Sort by created_at (newest first)
            eventsArray.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

            const latestEvent = eventsArray[0];
            const pTags = latestEvent.tags.filter(tag => tag[0] === 'p');
            const pubkeys: string[] = [];

            for (const tag of pTags) {
                if (tag[1] && typeof tag[1] === 'string') {
                    userProfile.following.add(tag[1]);
                    pubkeys.push(tag[1]);
                }
            }

            // Save snapshot of the follow list
            saveFollowSnapshot(latestEvent, pubkeys);
        }

        // Get the user's kind 10002 relays and add them to the list of relays
        const relaysFilter = { kinds: [NDKKind.RelayList], authors: [pubkey] };
        const relaysEvents = await ndk.fetchEvents(relaysFilter);
        for (const event of relaysEvents) {
            if (event.tags.length > 0) {
                for (const tag of event.tags) {
                    if (tag[0] === 'r' && tag[1]) {
                        userProfile.relays.add(tag[1]);
                    }
                }
            }
        }
        // Save the user profile to the store and cache
        user.set(userProfile);

        // append the global ndk instance with relays that are not already in the array
        ndk.explicitRelayUrls.push(...Array.from(userProfile.relays).filter(relay => !ndk.explicitRelayUrls.includes(relay)));

        // connect to the relays
        await ndk.connect();
        console.log('User connected to relays:', ndk.explicitRelayUrls);

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
export async function getProfileByPubkey(pubkey: string): Promise<{ name?: string, picture?: string, bio?: string, nip05?: string, nip05Verified?: boolean }> {
    // Check local cache first
    const cacheKey = PROFILE_CACHE_PREFIX + pubkey;
    const cachedProfile = localStorage.getItem(cacheKey);

    // If we have a cached profile and it's less than 24 hours old, use it
    if (cachedProfile) {
        logDebug('Using cached profile for', pubkey);
        const { data, timestamp } = JSON.parse(cachedProfile);
        const hasNameAndPicture = data.name || data.picture;
        const oneDay = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < oneDay && hasNameAndPicture) {
            return data;
        }
    }

    logDebug('Getting profile for', pubkey);

    // If no valid cache, fetch from relays
    try {
        const ndkUser = ndk.getUser({ pubkey });
        await ndkUser.fetchProfile();

        const profile = {
            name: ndkUser.profile?.name,
            picture: ndkUser.profile?.picture,
            bio: ndkUser.profile?.about,
            nip05: ndkUser.profile?.nip05,
            nip05Verified: false
        };

        // strip bio from all line breaks
        profile.bio = profile.bio?.replace(/\n/g, ' ');

        // // check if the nip05 is verified
        // if (profile.nip05) {
        //     try {
        //         profile.nip05Verified = await isNip05Verified(pubkey, profile.nip05);
        //     } catch (error) {
        //         console.error(`Error checking nip05 verification for ${pubkey}:`, error);
        //     }
        // }

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
 * Check if a NIP-05 domain is verified
 */
export async function isNip05Verified(pubkey: string, nip05: string): Promise<boolean> {
    const domain = nip05.split('@')[1];
    const user = nip05.split('@')[0];
    const url = `https://${domain}/.well-known/nostr.json?format=json`;
    const response = await fetch(url);
    const data = await response.json();
    return data.names[user] === pubkey;
}

/**
 * Follow a user by adding them to the current user's contact list
 */
export async function followUsers(pubkeysToFollow: string[]): Promise<boolean> {
    try {
        const signerNdk = await getNdkWithSigner();

        // Get the current user data
        const currentUser = get(user);
        if (!currentUser) throw new Error('No logged in user');

        // Create an updated follow list
        const event = new NDKEvent(signerNdk);
        event.kind = NDKKind.Contacts;

        // Create an array to store pubkeys for the snapshot
        const pubkeys: string[] = [];

        // Add all existing follows as p tags
        for (const pubkey of currentUser.following) {
            event.tags.push(['p', pubkey]);
            pubkeys.push(pubkey);
        }

        // Add the new pubkey if not already following
        for (const pubkeyToFollow of pubkeysToFollow) {
            if (!currentUser.following.has(pubkeyToFollow)) {
                event.tags.push(['p', pubkeyToFollow]);
                currentUser.following.add(pubkeyToFollow);
                pubkeys.push(pubkeyToFollow);
            }
        }

        // Sign with the extension
        await event.sign();

        await publishEvent(event);

        // Save a snapshot of the follow list
        saveFollowSnapshot(event, pubkeys);

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

export async function unfollowUsers(pubkeysToUnfollow: string[]): Promise<boolean> {
    try {
        const signerNdk = await getNdkWithSigner();

        // Get the current user data
        const currentUser = get(user);
        if (!currentUser) throw new Error('No logged in user');

        // Create a new follow list event
        const event = new NDKEvent(signerNdk);
        event.kind = NDKKind.Contacts;

        // Create an array to store pubkeys for the snapshot
        const pubkeys: string[] = [];

        // Add all remaining follows as p tags
        for (const pubkey of currentUser.following) {
            if (!pubkeysToUnfollow.includes(pubkey)) {
                event.tags.push(['p', pubkey]);
                pubkeys.push(pubkey);
            } else {
                currentUser.following.delete(pubkey);
            }
        }

        // Sign with the extension
        await event.sign();

        await publishEvent(event);

        // Save a snapshot of the follow list
        saveFollowSnapshot(event, pubkeys);

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
        console.error('Error unfollowing users:', error);
        return false;
    }
}

/**
 * Restore a follow list from a snapshot
 */
export async function restoreFollowSnapshot(snapshot: FollowSnapshot): Promise<boolean> {
    try {
        const signerNdk = await getNdkWithSigner();

        // Get the current user data
        const currentUser = get(user);
        if (!currentUser) throw new Error('No logged in user');

        // Create a new follow list event
        const event = new NDKEvent(signerNdk);
        event.kind = NDKKind.Contacts;

        // Add all pubkeys from the snapshot as p tags
        for (const pubkey of snapshot.pubkeys) {
            event.tags.push(['p', pubkey]);
        }

        // Sign with the extension
        await event.sign();

        // Publish to each relay individually
        // const allRelays = new Set([...currentUser.relays, ...DEFAULT_RELAYS]);
        // for (const relayUrl of allRelays) {
        //     try {
        //         const relay = await signerNdk.pool.getRelay(relayUrl);
        //         await relay.publish(event);
        //         logDebug(`Published to ${relayUrl}`);
        //     } catch (err) {
        //         logDebug(`Failed to publish to ${relayUrl}:`, err);
        //     }
        // }
        await publishEvent(event);

        // Update the user's following set
        currentUser.following = new Set<string>(snapshot.pubkeys);

        // Update the store
        user.set(currentUser);

        // Update cache
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(currentUser, (key, value) => {
            if (value instanceof Set) {
                return Array.from(value);
            }
            return value;
        }));

        // Save this restore action as a new snapshot
        saveFollowSnapshot(event, snapshot.pubkeys);

        return true;
    } catch (error) {
        console.error('Error restoring follow snapshot:', error);
        return false;
    }
} 