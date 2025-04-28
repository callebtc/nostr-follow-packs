import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { browser } from '$app/environment';
import { loadUser, user } from '$lib/stores/user';
import { get } from 'svelte/store';
// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[NDK]', ...args);
};

// Define the default relays to connect to
export const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://relay.8333.space',
    "wss://nostr-pub.wellorder.net",
    "wss://nostr.oxtr.dev",
    "wss://nos.lol"
];

// Create and configure the NDK instance
export const ndk = new NDK({
    explicitRelayUrls: DEFAULT_RELAYS,
    enableOutboxModel: false, // We'll handle publishing manually
});

// Only connect in browser environment
if (browser) {
    // load user 
    await loadUser();
    ndk.connect().then(() => {
        logDebug('Connected to relays:', DEFAULT_RELAYS);
    }).catch(err => {
        console.error('Failed to connect to relays:', err);
        logDebug('Failed to connect to relays:', err);
    });
}

/**
 * Get the NDK instance with the NIP-07 signer if available
 */
export async function getNdkWithSigner(): Promise<NDK> {
    if (!browser) return ndk;

    try {
        // Check if NIP-07 extension is available
        if (!(window as any).nostr) {
            throw new Error('No NIP-07 extension found');
        }

        // Create a new NDK instance with the NIP-07 signer
        const nip07Signer = new NDKNip07Signer();
        logDebug('Created NIP-07 signer');

        const signerNdk = new NDK({
            explicitRelayUrls: DEFAULT_RELAYS,
            enableOutboxModel: false,
            signer: nip07Signer
        });

        await signerNdk.connect();
        logDebug('Connected signer NDK to relays');
        return signerNdk;
    } catch (error) {
        console.error('Error getting NDK with signer:', error);
        logDebug('Error getting NDK with signer:', error);
        return ndk;
    }
}

export async function publishEvent(event: NDKEvent) {
    const PUBLISH_TIMEOUT_MS = 5000;

    const signerNdk = await getNdkWithSigner();
    const currentUser = get(user);
    if (!currentUser) throw new Error('No logged in user');

    // Publish to currentUser.relays + DEFAULT_RELAYS
    const allRelays = new Set([...currentUser.relays, ...DEFAULT_RELAYS]);
    logDebug(`Publishing to ${allRelays.size} relays with ${PUBLISH_TIMEOUT_MS}ms timeout`);

    // Start all publish operations simultaneously without awaiting them yet
    const publishPromises = Array.from(allRelays).map(async (relayUrl) => {
        try {
            const relay = await signerNdk.pool.getRelay(relayUrl);
            return relay.publish(event, PUBLISH_TIMEOUT_MS)
                .then(() => {
                    logDebug(`Published to ${relayUrl}`);
                    return true; // Indicate success
                })
                .catch((err) => {
                    logDebug(`Failed to publish to ${relayUrl}:`, err);
                    return false; // Indicate failure
                });
        } catch (err) {
            logDebug(`Failed to get relay ${relayUrl}:`, err);
            return false; // Indicate failure
        }
    });

    // Use Promise.allSettled to wait for all publish attempts to complete or timeout
    const results = await Promise.allSettled(publishPromises);

    // Count how many relays successfully received the event
    const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value === true
    ).length;

    logDebug(`Published to ${successCount}/${allRelays.size} relays`);

    // Return true if at least one relay confirmed receipt
    return successCount > 0;
}