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
    // Add these to make it more resilient on server
    autoConnectUserRelays: false,
    autoFetchUserMutelist: false,
});

/**
 * Connect to NDK with timeout to prevent hanging
 */
export const connectWithTimeout = async (timeoutMs = 10000) => {
    return new Promise(async (resolve, reject) => {
        // Create a timeout that will reject if connection takes too long
        const timeout = setTimeout(() => {
            logDebug('NDK connection timeout after', timeoutMs, 'ms');
            // Don't reject - just resolve with false to indicate timeout
            resolve(false);
        }, timeoutMs);

        try {
            await ndk.connect();
            clearTimeout(timeout);
            logDebug('[ndk connect] Connected to relays:', ndk.explicitRelayUrls);
            resolve(true);
        } catch (err) {
            clearTimeout(timeout);
            console.error('Failed to connect to relays:', err);
            logDebug('Failed to connect to relays:', err);
            // Still resolve but with false to indicate failure
            resolve(false);
        }
    });
};

// Only connect in browser environment
if (browser) {
    // load user 
    // await loadUser();
    ndk.connect().then(() => {
        logDebug('[ndk init] Connected to relays:', ndk.explicitRelayUrls);
    }).catch(err => {
        console.error('Failed to connect to relays:', err);
        logDebug('Failed to connect to relays:', err);
    });
}
