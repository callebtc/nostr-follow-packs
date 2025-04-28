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
    // await loadUser();
    ndk.connect().then(() => {
        logDebug('[ndk init] Connected to relays:', ndk.explicitRelayUrls);
    }).catch(err => {
        console.error('Failed to connect to relays:', err);
        logDebug('Failed to connect to relays:', err);
    });
}
