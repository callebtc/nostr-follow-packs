import { ndk } from '$lib/nostr/ndk';
import { NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk';
import { getProfileByPubkey } from '$lib/stores/user';

/**
 * Result type from Vertex search API
 */
export interface VertexSearchResult {
    pubkey: string;
    rank: number;
    name?: string;
    picture?: string;
}

/**
 * Vertex search kinds
 */
const VERTEX_SEARCH_REQUEST_KIND = 5315;
const VERTEX_SEARCH_RESPONSE_KIND = 6315 as unknown as number;
const VERTEX_ERROR_KIND = 7000 as unknown as number;

/**
 * Search for a user by name or npub using Vertex AI
 */
export async function searchUsers(query: string): Promise<VertexSearchResult[]> {
    if (!query || query.length < 3) {
        return [];
    }

    try {
        // Create a DVM request event (NIP-90)
        const searchEvent = new NDKEvent(ndk);
        searchEvent.kind = VERTEX_SEARCH_REQUEST_KIND;
        searchEvent.content = '';
        searchEvent.tags = [['param', 'search', query]];

        // Sign and publish the event
        await searchEvent.sign();
        await searchEvent.publish();

        // Subscribe to the responses
        const filter: NDKFilter = {
            kinds: [VERTEX_SEARCH_RESPONSE_KIND, VERTEX_ERROR_KIND],
            '#e': [searchEvent.id],
        };

        const timeout = new Promise<NDKEvent[]>(resolve => {
            setTimeout(() => resolve([]), 5000); // 5 second timeout
        });

        // Wait for responses (first result or timeout)
        const responses = await Promise.race([
            ndk.fetchEvents(filter),
            timeout
        ]);

        // Process responses
        for (const response of responses) {
            // Check if it's an error response
            if (response.kind === VERTEX_ERROR_KIND) {
                console.error('Vertex search error:', response.content);
                return [];
            }

            // Handle successful response
            if (response.kind === VERTEX_SEARCH_RESPONSE_KIND && response.content) {
                try {
                    // Parse the response content (JSON array of {pubkey, rank})
                    const results = JSON.parse(response.content) as Array<{ pubkey: string, rank: number }>;

                    // Fetch profiles for each result
                    const enhancedResults: VertexSearchResult[] = [];
                    for (const result of results) {
                        try {
                            const profile = await getProfileByPubkey(result.pubkey);
                            enhancedResults.push({
                                ...result,
                                name: profile.name,
                                picture: profile.picture
                            });
                        } catch (err) {
                            // Add result even without profile
                            enhancedResults.push(result);
                        }
                    }

                    return enhancedResults;
                } catch (err) {
                    console.error('Error parsing Vertex search response:', err);
                }
            }
        }

        return [];
    } catch (error) {
        console.error('Error searching with Vertex:', error);
        return [];
    }
}

/**
 * Check if a string looks like a nostr npub 
 */
export function isValidNpub(input: string): boolean {
    return input.startsWith('npub1') && input.length === 63;
}

/**
 * Convert npub to hex pubkey
 */
export async function npubToHex(npub: string): Promise<string | null> {
    try {
        if (!isValidNpub(npub)) return null;

        // Use nostr-tools bech32 conversion
        const { nip19 } = await import('nostr-tools');
        const { data } = nip19.decode(npub);
        return data as string;
    } catch (error) {
        console.error('Error converting npub to hex:', error);
        return null;
    }
}

/**
 * Convert hex pubkey to npub
 */
export async function hexToNpub(hex: string): Promise<string | null> {
    try {
        // Use nostr-tools bech32 conversion
        const { nip19 } = await import('nostr-tools');
        return nip19.npubEncode(hex);
    } catch (error) {
        console.error('Error converting hex to npub:', error);
        return null;
    }
} 