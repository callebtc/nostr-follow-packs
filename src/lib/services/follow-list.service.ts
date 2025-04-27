import { ndk, getNdkWithSigner } from '$lib/nostr/ndk';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import {
    FOLLOW_LIST_KIND,
    parseFollowListEvent,
    createFollowListEvent
} from '$lib/types/follow-list';
import type {
    FollowList,
    FollowListEntry
} from '$lib/types/follow-list';
import { getProfileByPubkey } from '$lib/stores/user';

/**
 * Get a list of the most recent follow lists from relays
 */
export async function getFollowLists(limit: number = 20): Promise<FollowList[]> {
    try {
        // Fetch follow list events from relays
        const filter = { kinds: [FOLLOW_LIST_KIND], limit };
        const events = await ndk.fetchEvents(filter);

        // Convert events to FollowList objects
        const followLists: FollowList[] = [];
        for (const event of events) {
            const list = parseFollowListEvent(event);
            if (list) {
                // Try to get the author's profile info
                try {
                    const authorProfile = await getProfileByPubkey(event.pubkey);
                    list.authorName = authorProfile.name;
                    list.authorPicture = authorProfile.picture;
                } catch (error) {
                    console.error('Error fetching author profile:', error);
                }

                // Try to get profile info for the first few entries
                const entriesToLoad = Math.min(list.entries.length, 5);
                for (let i = 0; i < entriesToLoad; i++) {
                    try {
                        const entry = list.entries[i];
                        const profile = await getProfileByPubkey(entry.pubkey);
                        entry.name = profile.name;
                        entry.picture = profile.picture;
                    } catch (err) {
                        console.error(`Error fetching profile for entry ${i}:`, err);
                    }
                }

                followLists.push(list);
            }
        }

        // Sort by created_at (newest first)
        return followLists.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('Error fetching follow lists:', error);
        return [];
    }
}

/**
 * Get a single follow list by its event ID
 */
export async function getFollowListById(id: string): Promise<FollowList | null> {
    try {
        // Fetch the specific event by ID
        const filter = { ids: [id] };
        const events = await ndk.fetchEvents(filter);

        // Find the event
        for (const event of events) {
            const list = parseFollowListEvent(event);
            if (list) {
                // Get the author's profile
                try {
                    const authorProfile = await getProfileByPubkey(event.pubkey);
                    list.authorName = authorProfile.name;
                    list.authorPicture = authorProfile.picture;
                } catch (error) {
                    console.error('Error fetching author profile:', error);
                }

                // Get profile info for all entries
                for (const entry of list.entries) {
                    try {
                        const profile = await getProfileByPubkey(entry.pubkey);
                        entry.name = profile.name;
                        entry.picture = profile.picture;
                    } catch (err) {
                        console.error(`Error fetching profile for entry:`, err);
                    }
                }

                return list;
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching follow list by ID:', error);
        return null;
    }
}

/**
 * Publish a new follow list event
 */
export async function publishFollowList(
    name: string,
    coverImageUrl: string,
    entries: FollowListEntry[]
): Promise<string | null> {
    try {
        // Make sure we have a signer
        const signerNdk = await getNdkWithSigner();

        // Create the follow list event
        const followList = {
            name,
            coverImageUrl,
            pubkey: '', // Will be set by the signer
            entries
        };

        const event = createFollowListEvent(followList);

        // Sign and publish the event
        await event.sign();
        await event.publish();

        return event.id;
    } catch (error) {
        console.error('Error publishing follow list:', error);
        return null;
    }
} 