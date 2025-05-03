import { ndk } from '$lib/nostr/ndk';
import NDK, { NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk';
import { getProfileByPubkey, loadUser, user } from '$lib/stores/user';
import { get } from 'svelte/store';

const DEFAULT_SEARCH_RELAYS = [
    'wss://search.nos.today',
    'wss://relay.nostr.band',
    'wss://relay.noswhere.com',
];
// Debug logging configuration
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[User Search]', ...args);
};

/**
 * Result type from User search
 */
export interface UserSearchResult {
    pubkey: string;
    relays: string[];
    rank: number;
    name?: string;
    picture?: string;
}

/**
 * Search for users by username using NIP-50 search capability 
 * NIP-50 allows relays to implement a search capability with a "search" field in filters.
 * This function searches for user profiles (kind 0 events) matching the given query.
 * 
 * @param searchQuery The username to search for
 * @param limit Maximum number of results to return (optional, default: 10)
 * @returns Promise<UserSearchResult[]> Array of user search results
 */
export async function searchUsersByName(searchQuery: string, limit: number = 5): Promise<UserSearchResult[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
    }

    const searchNdk = new NDK({ explicitRelayUrls: DEFAULT_SEARCH_RELAYS });
    await searchNdk.connect();

    logDebug(`Searching for users with query: "${searchQuery}", limit: ${limit}`);

    try {
        // Create a filter using NIP-50 search field
        const QUERY_LIMIT = 100;
        const filter: NDKFilter = {
            kinds: [0], // We're only interested in metadata/profile events
            search: searchQuery,
            limit: QUERY_LIMIT
        };

        // Execute the search - Note: We need to wait for EOSE (end of stored events)
        // to make sure we get all relevant results from NIP-50 search
        const events = await searchNdk.fetchEvents(filter, {
            closeOnEose: true
        });

        let results: UserSearchResult[] = [];
        let counter = 0;

        if (!events || events.size === 0) {
            logDebug('No results found');
            return [];
        }

        // Process the results
        for (const event of events) {
            try {
                let name;
                let picture;

                try {
                    // Try to parse the content as JSON (kind 0 events have JSON content)
                    const content = JSON.parse(event.content);
                    name = content.name || content.displayName || 'Unknown';
                    if (!name.toLowerCase().startsWith(searchQuery.toLowerCase())) {
                        continue;
                    }
                    picture = content.picture || '';
                } catch (e) {
                    // If parsing fails, use the raw content as name
                    name = event.content || 'Unknown';
                    picture = '';
                }

                // if we (user) are following the author, set rank to 1
                let ourUser = get(user);
                if (!ourUser) await loadUser();
                ourUser = get(user);
                const following = ourUser?.following?.has(event.pubkey);
                let rank = 0;
                if (following) {
                    rank = 1;
                }

                // Create a UserSearchResult from the event
                const result: UserSearchResult = {
                    pubkey: event.pubkey,
                    relays: [],
                    rank,
                    name,
                    picture
                };

                results.push(result);
                counter++;
            } catch (err) {
                logDebug(`Error processing event: ${err}`);
                // Continue with the next event
            }
        }

        logDebug(`Found ${results.length} users`);

        // sort results by rank
        results.sort((a, b) => b.rank - a.rank);

        // Limit the number of results to process
        if (results.length > limit) {
            results = results.slice(0, limit);
        }

        return results;
    } catch (err) {
        logDebug(`Error searching users: ${err}`);
        return [];
    }
}


