import { ndk } from "$lib/nostr/ndk";
import { NDKEvent } from "@nostr-dev-kit/ndk";

// The constant for our custom follow list event kind (replaceable)
export const FOLLOW_LIST_KIND = 39088;

export interface FollowListEntry {
    pubkey: string;
    name?: string;
    picture?: string;
    npub?: string;
    bio?: string;
    nip05?: string;
    nip05Verified?: boolean;
}

export interface FollowList {
    id: string;
    eventId: string;
    name: string;
    coverImageUrl: string;
    pubkey: string;
    entries: FollowListEntry[];
    createdAt: number;
    authorName?: string;
    authorPicture?: string;
    description?: string;
}

/**
 * Parse a Nostr event into a FollowList object
 */
export function parseFollowListEvent(event: NDKEvent): FollowList | null {
    try {
        // Get the name from the title tag
        const titleTag = event.tags.find(tag => tag[0] === 'title');
        // backwards compat: n tag instead of title tag
        const nTag = event.tags.find(tag => tag[0] === 'n');
        const name = titleTag && titleTag[1] ? titleTag[1] : (nTag && nTag[1] ? nTag[1] : 'Untitled Follow Pack');

        // Get the id from the d tag
        const dTag = event.tags.find(tag => tag[0] === 'd');
        const id = dTag && dTag[1] ? dTag[1] : event.id;

        // Get the cover image from the image tag
        const imageTag = event.tags.find(tag => tag[0] === 'image');
        const coverImageUrl = imageTag && imageTag[1] ? imageTag[1] : '';

        // Parse the content (JSON with description)
        let description = '';
        // if "description" tag exists, use it
        const descriptionTag = event.tags.find(tag => tag[0] === 'description');
        if (descriptionTag && descriptionTag[1]) {
            description = descriptionTag[1];
        } else {
            // back compat for old follow lists
            try {
                const content = JSON.parse(event.content);
                description = content.description;
            } catch (e) {
                description = '';
            }
        }

        // Parse the content (JSON with keys array)
        let entries: FollowListEntry[] = [];

        // Get the entries from the p tags
        const pTags = event.tags.filter(tag => tag[0] === 'p');
        if (pTags.length > 0 && entries.length === 0) {
            entries = pTags.map(tag => ({
                pubkey: tag[1],
            }));
        }

        return {
            id,
            eventId: event.id,
            name,
            coverImageUrl,
            pubkey: event.pubkey,
            entries,
            createdAt: event.created_at || 0,
            description,
        };
    } catch (error) {
        console.error('Error parsing follow list event:', error);
        return null;
    }
}

/**
 * Create a follow list event from a FollowList object
 */
export async function createFollowListEvent(followList: Omit<FollowList, 'eventId' | 'createdAt' | 'authorName' | 'authorPicture'>): Promise<NDKEvent> {
    const event = new NDKEvent(ndk);

    // Set the kind
    event.kind = FOLLOW_LIST_KIND;

    // Add the tags
    event.tags.push(['title', followList.name]);
    event.tags.push(['d', followList.id]);

    if (followList.coverImageUrl) {
        event.tags.push(['image', followList.coverImageUrl]);
    }

    // Add each pubkey as a p tag for discoverability
    followList.entries.forEach(entry => {
        event.tags.push(['p', entry.pubkey]);
    });

    // set the description as a "description" tag
    if (followList.description) {
        event.tags.push(['description', followList.description]);
    }

    // Add the created at tag to current timestamp
    event.created_at = Math.floor(Date.now() / 1000);

    return event;
} 