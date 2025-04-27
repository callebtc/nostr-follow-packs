import { ndk, getNdkWithSigner } from '$lib/nostr/ndk';
import { NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk';
import { getProfileByPubkey } from '$lib/stores/user';

// Debug logging configuration
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Vertex Search]', ...args);
};

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
    logDebug('Searching for:', query);

    if (!query || query.length < 3) {
        logDebug('Query too short, returning empty results');
        return [];
    }

    try {
        // Get the NDK instance with signer
        const signerNdk = await getNdkWithSigner();
        logDebug('Got signer NDK instance');

        // Create a DVM request event (NIP-90)
        const searchEvent = new NDKEvent(signerNdk);
        searchEvent.kind = VERTEX_SEARCH_REQUEST_KIND;
        searchEvent.content = '';
        searchEvent.tags = [['param', 'search', query]];

        logDebug('Created search event:', searchEvent);

        // Sign and publish the event
        try {
            await searchEvent.sign();
            logDebug('Signed event');
        } catch (e) {
            logDebug('Error signing event:', e);
            // Continue with an unsigned event for public relays that don't require authentication
        }

        await searchEvent.publish();
        logDebug('Published event with ID:', searchEvent.id);

        // Subscribe to the responses
        const filter: NDKFilter = {
            kinds: [VERTEX_SEARCH_RESPONSE_KIND, VERTEX_ERROR_KIND],
            '#e': [searchEvent.id],
        };

        logDebug('Waiting for responses with filter:', filter);

        const timeout = new Promise<NDKEvent[]>(resolve => {
            setTimeout(() => {
                logDebug('Search timeout reached');
                resolve([]);
            }, 8000); // 8 second timeout (increased from 5s)
        });

        // Wait for responses (first result or timeout)
        const responses = await Promise.race([
            ndk.fetchEvents(filter),
            timeout
        ]);

        // Convert to array if it's a Set
        const responseArray = Array.from(responses);
        logDebug('Received responses:', responseArray.length);

        // Process responses
        for (const response of responseArray) {
            logDebug('Processing response kind:', response.kind);

            // Check if it's an error response
            if (response.kind === VERTEX_ERROR_KIND) {
                console.error('Vertex search error:', response.content);
                return [];
            }

            // Handle successful response
            if (response.kind === VERTEX_SEARCH_RESPONSE_KIND && response.content) {
                try {
                    // Parse the response content (JSON array of {pubkey, rank})
                    logDebug('Parsing response content:', response.content);
                    const results = JSON.parse(response.content) as Array<{ pubkey: string, rank: number }>;
                    logDebug('Parsed results:', results.length);

                    // Fetch profiles for each result
                    const enhancedResults: VertexSearchResult[] = [];
                    for (const result of results) {
                        try {
                            logDebug('Fetching profile for:', result.pubkey);
                            const profile = await getProfileByPubkey(result.pubkey);
                            enhancedResults.push({
                                ...result,
                                name: profile.name,
                                picture: profile.picture
                            });
                            logDebug('Added result with profile:', profile);
                        } catch (err) {
                            // Add result even without profile
                            logDebug('Error fetching profile, adding without profile data:', err);
                            enhancedResults.push(result);
                        }
                    }

                    logDebug('Returning enhanced results:', enhancedResults.length);
                    return enhancedResults;
                } catch (err) {
                    console.error('Error parsing Vertex search response:', err);
                    logDebug('Parse error:', err);
                }
            }
        }

        logDebug('No valid responses found, returning empty array');
        return [];
    } catch (error) {
        console.error('Error searching with Vertex:', error);
        logDebug('Search error:', error);
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
    logDebug('Converting npub to hex:', npub);
    try {
        if (!isValidNpub(npub)) {
            logDebug('Invalid npub format');
            return null;
        }

        // Use nostr-tools bech32 conversion
        const { nip19 } = await import('nostr-tools');
        const { data } = nip19.decode(npub);
        logDebug('Converted to hex:', data);
        return data as string;
    } catch (error) {
        console.error('Error converting npub to hex:', error);
        logDebug('Conversion error:', error);
        return null;
    }
}

/**
 * Convert hex pubkey to npub
 */
export async function hexToNpub(hex: string): Promise<string | null> {
    logDebug('Converting hex to npub:', hex);
    try {
        // Use nostr-tools bech32 conversion
        const { nip19 } = await import('nostr-tools');
        const npub = nip19.npubEncode(hex);
        logDebug('Converted to npub:', npub);
        return npub;
    } catch (error) {
        console.error('Error converting hex to npub:', error);
        logDebug('Conversion error:', error);
        return null;
    }
} 