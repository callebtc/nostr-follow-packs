import { ndk } from '$lib/nostr/ndk';
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
 * Vertex specific relay
 */
const VERTEX_RELAY = 'wss://relay.vertexlab.io';

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

        // Create a DVM request event (NIP-90)
        const searchEvent = new NDKEvent(ndk);
        searchEvent.kind = VERTEX_SEARCH_REQUEST_KIND;
        searchEvent.content = '';
        searchEvent.tags = [
            ['param', 'search', query],
            // Add additional params for better results
            ['param', 'limit', '10']
        ];

        logDebug('Created search event:', searchEvent);

        // Sign the event
        try {
            await searchEvent.sign();
            logDebug('Signed event');
        } catch (e) {
            logDebug('Error signing event:', e);
            // If we can't sign, we can't proceed - Vertex requires signed events
            throw new Error('Failed to sign search request');
        }

        // Try to publish specifically to the Vertex relay
        try {
            const vertexRelay = Array.from(ndk.pool.relays.values()).find((relay: any) =>
                relay.url === VERTEX_RELAY || relay.url.includes('vertexlab.io')
            );

            if (vertexRelay) {
                logDebug('Publishing directly to Vertex relay:', vertexRelay.url);
                await vertexRelay.publish(searchEvent);
                logDebug('Published to Vertex relay successfully');
            } else {
                // If we can't find the specific relay, try publishing to all
                logDebug('Vertex relay not found, publishing to all relays');
                await searchEvent.publish();
            }

            logDebug('Published event with ID:', searchEvent.id);
        } catch (pubError) {
            logDebug('Publish error, proceeding anyway:', pubError);
            // Continue even if publish fails - the event might have been sent
        }

        // Subscribe to the responses
        const filter: NDKFilter = {
            kinds: [VERTEX_SEARCH_RESPONSE_KIND, VERTEX_ERROR_KIND],
            '#e': [searchEvent.id],
            limit: 5,
        };

        logDebug('Waiting for responses with filter:', filter);

        // Use a longer timeout since vertex might take time to respond
        const timeoutDuration = 10000; // 10 seconds

        // Promise that resolves with events
        const fetchPromise = new Promise<NDKEvent[]>((resolve) => {
            const events: NDKEvent[] = [];
            const subscription = ndk.subscribe(filter, { closeOnEose: true });

            subscription.on('event', (event: NDKEvent) => {
                logDebug('Received event:', event.kind);
                events.push(event);
            });

            subscription.on('eose', () => {
                logDebug('End of stored events');
                resolve(events);
            });
        });

        // Set a timeout
        const timeoutPromise = new Promise<NDKEvent[]>((resolve) => {
            setTimeout(() => {
                logDebug('Search timeout reached');
                resolve([]);
            }, timeoutDuration);
        });

        // Wait for responses (first result or timeout)
        const responses = await Promise.race([
            fetchPromise,
            timeoutPromise
        ]);

        logDebug('Received responses:', responses.length);

        // Process responses
        for (const response of responses) {
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

        // If we get here and have no results, try a fallback approach
        logDebug('Fallback: Using hardcoded query to search for users starting with:', query);

        // Fallback to using standard kinds to find users with names containing the query
        try {
            const userFilter = {
                kinds: [0], // Metadata events
                limit: 10
            };

            const userEvents = await ndk.fetchEvents(userFilter);
            const eventsArray = Array.from(userEvents);
            logDebug(`Found ${eventsArray.length} user events`);

            const matchedUsers = eventsArray
                .filter(event => {
                    try {
                        const profile = JSON.parse(event.content);
                        return (
                            profile.name &&
                            profile.name.toLowerCase().includes(query.toLowerCase())
                        );
                    } catch (e) {
                        return false;
                    }
                })
                .map(event => {
                    try {
                        const profile = JSON.parse(event.content);
                        return {
                            pubkey: event.pubkey,
                            rank: 1, // No ranking in fallback
                            name: profile.name,
                            picture: profile.picture
                        };
                    } catch (e) {
                        return {
                            pubkey: event.pubkey,
                            rank: 1
                        };
                    }
                });

            logDebug('Fallback search found matches:', matchedUsers.length);
            return matchedUsers;
        } catch (fallbackErr) {
            logDebug('Fallback search failed:', fallbackErr);
        }

        logDebug('No valid responses found, returning empty array');
        return [];
    } catch (error) {
        console.error('Error searching with Vertex:', error);
        logDebug('Search error:', error);
        return [];
    }
}/**
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

