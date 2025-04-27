import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { browser } from '$app/environment';

// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[NDK]', ...args);
};

// Define the default relays to connect to
const DEFAULT_RELAYS = [
    'wss://relay.vertexlab.io',  // Vertex relay (needed for search)
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://purplepag.es',
    'wss://relay.snort.social'
];

// Create and configure the NDK instance
export const ndk = new NDK({
    explicitRelayUrls: DEFAULT_RELAYS,
    enableOutboxModel: false, // We'll handle publishing manually
});

// Only connect in browser environment
if (browser) {
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