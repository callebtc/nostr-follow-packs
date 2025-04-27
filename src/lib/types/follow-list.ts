import { NDKEvent } from "@nostr-dev-kit/ndk";

// The constant for our custom follow list event kind (replaceable)
export const FOLLOW_LIST_KIND = 29089;

export interface FollowListEntry {
    pubkey: string;
    name?: string;
    picture?: string;
    npub?: string;
}

export interface FollowList {
    id: string;
    name: string;
    coverImageUrl: string;
    pubkey: string;
    entries: FollowListEntry[];
    createdAt: number;
    authorName?: string;
    authorPicture?: string;
}

/**
 * Parse a Nostr event into a FollowList object
 */
export function parseFollowListEvent(event: NDKEvent): FollowList | null {
    try {
        // Get the name from the d tag
        const dTag = event.tags.find(tag => tag[0] === 'd');
        const name = dTag && dTag[1] ? dTag[1] : 'Untitled Follow List';

        // Get the cover image from the image tag
        const imageTag = event.tags.find(tag => tag[0] === 'image');
        const coverImageUrl = imageTag && imageTag[1] ? imageTag[1] : '';

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
            id: event.id,
            name,
            coverImageUrl,
            pubkey: event.pubkey,
            entries,
            createdAt: event.created_at || 0,
        };
    } catch (error) {
        console.error('Error parsing follow list event:', error);
        return null;
    }
}

/**
 * Create a follow list event from a FollowList object
 */
export function createFollowListEvent(followList: Omit<FollowList, 'id' | 'createdAt' | 'authorName' | 'authorPicture'>): NDKEvent {
    const event = new NDKEvent();

    // Set the kind
    event.kind = FOLLOW_LIST_KIND;

    // Add the tags
    event.tags.push(['d', followList.name]);
    if (followList.coverImageUrl) {
        event.tags.push(['image', followList.coverImageUrl]);
    }

    // Add each pubkey as a p tag for discoverability
    followList.entries.forEach(entry => {
        event.tags.push(['p', entry.pubkey]);
    });

    return event;
} 