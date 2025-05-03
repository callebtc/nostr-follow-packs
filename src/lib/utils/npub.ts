// Debug logging configuration
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Npub Utils]', ...args);
};

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
