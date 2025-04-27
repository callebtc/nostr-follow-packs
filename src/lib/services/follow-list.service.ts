import { ndk, getNdkWithSigner, DEFAULT_RELAYS, publishEvent } from '$lib/nostr/ndk';
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
import { getProfileByPubkey, user } from '$lib/stores/user';
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
    logDebug('Fetching follow lists, limit:', limit);

    try {
        // Fetch follow list events from relays
        const filter = { kinds: [FOLLOW_LIST_KIND], limit, since, until };
        logDebug('Fetching with filter:', filter);

        const events = await ndk.fetchEvents(filter);
        const eventsArray = Array.from(events);
        logDebug(`Fetched ${eventsArray.length} events`);

        // Convert events to FollowList objects
        const followLists: FollowList[] = [];
        for (const event of eventsArray) {
            const list = parseFollowListEvent(event);
            if (list) {
                logDebug('Parsed list:', { id: list.id, name: list.name, entries: list.entries.length });

                // Try to get the author's profile info
                try {
                    const authorProfile = await getProfileByPubkey(event.pubkey);
                    list.authorName = authorProfile.name;
                    list.authorPicture = authorProfile.picture;
                    logDebug('Added author info:', { name: authorProfile.name });
                } catch (error) {
                    console.error('Error fetching author profile:', error);
                    logDebug('Error fetching author profile:', error);
                }

                // Try to get profile info for the first few entries
                const entriesToLoad = Math.min(list.entries.length, 5);
                logDebug(`Loading profiles for first ${entriesToLoad} entries`);

                for (let i = 0; i < entriesToLoad; i++) {
                    try {
                        const entry = list.entries[i];
                        const profile = await getProfileByPubkey(entry.pubkey);
                        entry.name = profile.name;
                        entry.picture = profile.picture;
                        logDebug(`Loaded profile for entry ${i}:`, { name: profile.name });
                    } catch (err) {
                        console.error(`Error fetching profile for entry ${i}:`, err);
                        logDebug(`Error fetching profile for entry ${i}:`, err);
                    }
                }

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

/**
 * Get a single follow list by its event ID
 */
export async function getFollowListById(id: string): Promise<FollowList | null> {
    logDebug('Fetching follow list by ID:', id);

    try {
        // Fetch the specific event by ID
        const filter = { ids: [id] };
        logDebug('Fetching with filter:', filter);

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

                // Get profile info for all entries
                logDebug(`Loading profiles for ${list.entries.length} entries`);
                for (const entry of list.entries) {
                    try {
                        const profile = await getProfileByPubkey(entry.pubkey);
                        entry.name = profile.name;
                        entry.picture = profile.picture;
                        logDebug(`Loaded profile:`, { pubkey: entry.pubkey, name: profile.name });
                    } catch (err) {
                        console.error(`Error fetching profile for entry:`, err);
                        logDebug(`Error fetching profile for entry:`, err);
                    }
                }

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

        // Make sure we have a signer
        const signerNdk = await getNdkWithSigner();
        logDebug('Got signer NDK instance');

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

        const event = createFollowListEvent(followList);
        event.ndk = signerNdk;
        logDebug('Created event:', { kind: event.kind, tags: event.tags, content: event.content });

        // Sign and publish the event
        await event.sign();
        logDebug('Signed event with ID:', event.id);

        // await event.publish();
        // logDebug('Published event successfully');

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

        // Make sure we have a signer
        const signerNdk = await getNdkWithSigner();
        logDebug('Got signer NDK instance');

        // Create deletion event (kind 5)
        const event = new NDKEvent();
        event.kind = 5; // Deletion request
        event.ndk = signerNdk;

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

        await publishEvent(event);

        return true;
    } catch (error) {
        console.error('Error deleting follow list:', error);
        logDebug('Error deleting follow list:', error);
        return false;
    }
}

