import { ndk } from '$lib/nostr/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import {
    FOLLOW_LIST_KIND,
    parseFollowListEvent,
    createFollowListEvent
} from '$lib/types/follow-list';
import type {
    FollowList,
    FollowListEntry
} from '$lib/types/follow-list';
import { getProfileByPubkey, loadUser, user } from '$lib/stores/user';
import { get } from 'svelte/store';

export const LIST_LIMIT = 20;

// Debug logging configuration
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Follow List Service]', ...args);
};

/**
 * Get a list of the most recent follow lists from relays
 */
export async function getFollowLists(limit: number = LIST_LIMIT, since?: number, until?: number): Promise<FollowList[]> {
    // ensure that user is loaded 
    try {
        await loadUser();
    } catch (error) {
        console.error('Error loading user:', error);
        logDebug('Error loading user:', error);
    }

    logDebug('Fetching follow lists, limit:', limit);

    try {
        // Fetch follow list events from relays
        const filter = { kinds: [FOLLOW_LIST_KIND], limit, since, until };
        logDebug('Fetching with filter:', filter);
        logDebug('Current relays', ndk.explicitRelayUrls.length, ndk.explicitRelayUrls);

        const events = await ndk.fetchEvents(filter);
        const eventsArray = Array.from(events);
        logDebug(`Fetched ${eventsArray.length} events`);

        // Convert events to FollowList objects
        const followLists: FollowList[] = [];
        for (const event of eventsArray) {
            const list = parseFollowListEvent(event);
            if (list) {
                logDebug('Parsed list:', { id: list.id, name: list.name, entries: list.entries.length });
                followLists.push(list);
            }
        }

        // Sort by created_at (newest first)
        const sortedLists = followLists.sort((a, b) => b.createdAt - a.createdAt);
        logDebug(`Returning ${sortedLists.length} follow lists`);

        return sortedLists;
    } catch (error) {
        console.error('Error fetching follow lists:', error);
        logDebug('Error fetching follow lists:', error);
        return [];
    }
}

export async function getAuthorProfile(list: FollowList) {
    const authorProfile = await getProfileByPubkey(list.pubkey);
    list.authorName = authorProfile.name;
    list.authorPicture = authorProfile.picture;
    return list;
}

export async function getProfileInfoForEntries(list: FollowList, maxEntries: number | undefined = undefined): Promise<FollowList> {
    const entriesToLoad = maxEntries ? Math.min(list.entries.length, maxEntries) : list.entries.length;
    for (let i = 0; i < entriesToLoad; i++) {
        try {
            const entry = list.entries[i];
            const profile = await getProfileByPubkey(entry.pubkey);
            // Create a new entry object to trigger reactivity
            const updatedEntry = { ...entry, name: profile.name, picture: profile.picture, bio: profile.bio, nip05: profile.nip05, nip05Verified: profile.nip05Verified };
            // Replace the entry in the array with the new object
            list.entries[i] = updatedEntry;
            // Force the component to update by replacing the entire list reference
            list = { ...list, entries: [...list.entries] };
        } catch (err) {
            console.error(`Error fetching profile for entry:`, err);
            logDebug(`Error fetching profile for entry:`, err);
        }
    }
    return list;
}

/**
 * Get a single follow list by its event ID
 */
export async function getFollowListById(id: string): Promise<FollowList | null> {
    // ensure that user is loaded 
    try {
        await loadUser();
    } catch (error) {
        console.error('Error loading user:', error);
        logDebug('Error loading user:', error);
    }

    logDebug('Fetching follow list by ID:', id);

    try {
        // Fetch the specific event by ID
        const filter = { ids: [id] };
        logDebug('Fetching with filter:', filter);
        logDebug('Current relays:', ndk.explicitRelayUrls);

        const events = await ndk.fetchEvents(filter);
        const eventsArray = Array.from(events);
        logDebug(`Fetched ${eventsArray.length} events`);

        // Find the event
        for (const event of eventsArray) {
            const list = parseFollowListEvent(event);
            if (list) {
                logDebug('Parsed list:', {
                    id: list.id,
                    name: list.name,
                    entries: list.entries.length
                });

                // Get the author's profile
                try {
                    const authorProfile = await getProfileByPubkey(event.pubkey);
                    list.authorName = authorProfile.name;
                    list.authorPicture = authorProfile.picture;
                    logDebug('Added author info:', { name: authorProfile.name });
                } catch (error) {
                    console.error('Error fetching author profile:', error);
                    logDebug('Error fetching author profile:', error);
                }

                // We'll load profile info for entries separately to make it reactive
                return list;
            }
        }

        logDebug('No follow list found with ID:', id);
        return null;
    } catch (error) {
        console.error('Error fetching follow list by ID:', error);
        logDebug('Error fetching follow list by ID:', error);
        return null;
    }
}

/**
 * Publish a new follow list event
 */
export async function publishFollowList(
    name: string,
    coverImageUrl: string,
    entries: FollowListEntry[],
    id: string | undefined,
    description?: string
): Promise<string | null> {
    logDebug('Publishing follow list:', { name, coverImageUrl, entries: entries.length, description });

    try {
        // Get the current user
        const currentUser = get(user);
        if (!currentUser) throw new Error('No logged in user');

        // if id is not set, generate a new one
        if (!id) {
            id = crypto.randomUUID();
        }

        // Create the follow list event
        const followList = {
            id,
            name,
            coverImageUrl,
            pubkey: '', // Will be set by the signer
            entries,
            description
        };

        const event = await createFollowListEvent(followList);
        logDebug('Created event:', { kind: event.kind, tags: event.tags, content: event.content });

        // Sign and publish the event
        await event.sign();
        logDebug('Signed event with ID:', event.id);

        if (ndk.pool.connectedRelays().length === 0) {
            logDebug('No connected relays, connecting...');
            await ndk.connect();
        }
        event.ndk = ndk;
        await event.publish();

        return event.id;
    } catch (error) {
        console.error('Error publishing follow list:', error);
        logDebug('Error publishing follow list:', error);
        return null;
    }
}

/**
 * Delete a follow list by its ID
 */
export async function deleteFollowList(id: string, eventId: string): Promise<boolean> {
    logDebug('Deleting follow list with ID:', id);

    try {
        // Get the current user
        const currentUser = get(user);
        if (!currentUser) throw new Error('No logged in user');

        // Create deletion event (kind 5)
        const event = new NDKEvent(ndk);
        event.kind = 5; // Deletion request

        // Get the current user's pubkey
        const userPubkey = await (window as any).nostr.getPublicKey();

        // Add an e-tag for the event ID
        event.tags.push(['e', eventId]);

        // Add the a-tag for parametrized replaceable event
        event.tags.push(['a', `${FOLLOW_LIST_KIND}:${userPubkey}:${eventId}`]);

        // Add k-tag for the kind being deleted
        event.tags.push(['k', FOLLOW_LIST_KIND.toString()]);

        // Optional deletion reason
        event.content = 'Follow list deleted by user';

        // Sign and publish the event
        await event.sign();
        logDebug('Signed deletion event with ID:', event.id);

        await event.publish();

        return true;
    } catch (error) {
        console.error('Error deleting follow list:', error);
        logDebug('Error deleting follow list:', error);
        return false;
    }
}

