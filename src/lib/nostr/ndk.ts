import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { browser } from '$app/environment';

// Define the default relays to connect to
const DEFAULT_RELAYS = ['wss://relay.vertexlab.io', 'wss://relay.damus.io'];

// Create and configure the NDK instance
export const ndk = new NDK({
    explicitRelayUrls: DEFAULT_RELAYS,
    enableOutboxModel: false, // We'll handle publishing manually
});

// Only connect in browser environment
if (browser) {
    ndk.connect().catch(err => {
        console.error('Failed to connect to relays:', err);
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

        const signerNdk = new NDK({
            explicitRelayUrls: DEFAULT_RELAYS,
            enableOutboxModel: false,
            signer: nip07Signer
        });

        await signerNdk.connect();
        return signerNdk;
    } catch (error) {
        console.error('Error getting NDK with signer:', error);
        return ndk;
    }
} 