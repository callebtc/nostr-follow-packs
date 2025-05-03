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
export interface UserSearchResult {
    pubkey: string;
    relays: string[];
    rank: number;
    name?: string;
    picture?: string;
}


