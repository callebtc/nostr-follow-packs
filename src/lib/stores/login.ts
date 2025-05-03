import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
    NDKNip07Signer,
    NDKPrivateKeySigner,
    NDKNip46Signer,
    NDKEvent,
    NDKSubscription,
    NDKUser
} from '@nostr-dev-kit/ndk';
import { ndk } from '$lib/nostr/ndk';
import { nip04, nip44 } from 'nostr-tools';
import * as nostrTools from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { FOLLOW_LIST_KIND } from '$lib/types/follow-list';

// Login method types
export enum LoginMethod {
    EXTENSION = 'extension',
    NSEC = 'nsec',
    BUNKER = 'bunker',
    NOSTRCONNECT = 'nostrconnect',
    NONE = 'none'
}

// NIP-46 Request kind (24133)
const NIP46_REQUEST_KIND = 24133;

export interface LoginState {
    method: LoginMethod;
    loggedIn: boolean;
    data?: {
        nsec?: string;
        bunkerUrl?: string;
        nostrconnect?: {
            signer?: string;
        };
    };
}

// Local storage key
const LOGIN_STATE_KEY = 'nostr-follow-list:login';

// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Login Store]', ...args);
};

// Initialize store with default state
const defaultState: LoginState = {
    method: LoginMethod.NONE,
    loggedIn: false
};

export const loginState = writable<LoginState>(defaultState);

// Connection status for nostrconnect
export const connectStatus = writable<{
    status: 'idle' | 'waiting' | 'connected' | 'error';
    message?: string;
    clientPubkey?: string;
    secret?: string;
    subscription?: NDKSubscription;
}>({
    status: 'idle'
});

// Load login state from localStorage when browser is available
if (browser) {
    const savedState = localStorage.getItem(LOGIN_STATE_KEY);
    if (savedState) {
        try {
            loginState.set(JSON.parse(savedState));
        } catch (error) {
            console.error('Error parsing login state:', error);
        }
    }
}

/**
 * Check if a NIP-07 extension is available in the browser
 */
export async function checkNip07Extension(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return !!(window as any).nostr;
}

/**
 * Save login state to localStorage
 */
function saveLoginState(state: LoginState) {
    if (!browser) return;

    try {
        localStorage.setItem(LOGIN_STATE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving login state:', error);
    }
}

/**
 * Login with NIP-07 browser extension
 */
export async function loginWithExtension(): Promise<boolean> {
    try {
        // Check if extension is available
        if (!(await checkNip07Extension())) {
            throw new Error('NIP-07 extension not found');
        }

        // Create and set NIP-07 signer
        const nip07Signer = new NDKNip07Signer();
        logDebug('Created NIP-07 signer');
        await nip07Signer.blockUntilReady();
        ndk.signer = nip07Signer;
        logDebug('Set NIP-07 signer', ndk.signer);

        // Update login state
        const newState: LoginState = {
            method: LoginMethod.EXTENSION,
            loggedIn: true
        };
        loginState.set(newState);
        saveLoginState(newState);

        return true;
    } catch (error) {
        console.error('Error logging in with extension:', error);
        return false;
    }
}

/**
 * Login with private key (nsec)
 */
export async function loginWithNsec(nsec: string): Promise<boolean> {
    try {
        // Validate nsec format
        if (!nsec.startsWith('nsec1')) {
            throw new Error('Invalid nsec format');
        }

        // Create and set private key signer
        const privateKeySigner = new NDKPrivateKeySigner(nsec);
        logDebug('Created Private Key signer');
        ndk.signer = privateKeySigner;
        logDebug('Set Private Key signer');

        // Update login state - store sanitized data (we don't want to log the actual nsec)
        const newState: LoginState = {
            method: LoginMethod.NSEC,
            loggedIn: true,
            data: { nsec }
        };
        loginState.set(newState);
        saveLoginState(newState);

        return true;
    } catch (error) {
        console.error('Error logging in with nsec:', error);
        return false;
    }
}

/**
 * Login with NIP-46 Bunker
 */
export async function loginWithBunker(bunkerUrl: string): Promise<boolean> {
    // Validate bunker URL format
    if (!bunkerUrl.startsWith('bunker://')) {
        throw new Error('Invalid bunker URL format');
    }

    // Create and set NIP-46 signer
    const nip46Signer = new NDKNip46Signer(ndk, bunkerUrl);
    logDebug('Created NIP-46 signer');
    await nip46Signer.blockUntilReady();
    ndk.signer = nip46Signer;
    logDebug('Set NIP-46 signer');

    // Update login state
    const newState: LoginState = {
        method: LoginMethod.BUNKER,
        loggedIn: true,
        data: { bunkerUrl }
    };
    loginState.set(newState);
    saveLoginState(newState);

    return true;
}

export async function createNostrConnectSigner(relay: string): Promise<NDKNip46Signer> {

    const localPrivateKeyBytes = nostrTools.generateSecretKey();
    const localPrivateKey = bytesToHex(localPrivateKeyBytes);
    const perms = `sign_event:${FOLLOW_LIST_KIND},get_public_key`;
    const ndkPrivateKeySigner = new NDKPrivateKeySigner(hexToBytes(localPrivateKey));
    const signer = NDKNip46Signer.nostrconnect(ndk, relay, ndkPrivateKeySigner, {
        name: "following.space",
        perms: perms
    });
    return signer;
}

/**
 * Login with NostrConnect
 */
export async function loginWithNostrConnect(signer: NDKNip46Signer): Promise<boolean> {
    try {
        await signer.blockUntilReady();
        ndk.signer = signer;
        logDebug('Set NostrConnect signer');

        // ugly hack: get current serialized signer and use that as the signer payload
        let signerPayload = '';
        const currentLoginState = get(loginState);
        if (currentLoginState.loggedIn && currentLoginState.data?.nostrconnect && currentLoginState.data.nostrconnect.signer) {
            signerPayload = currentLoginState.data.nostrconnect.signer;
        } else {
            signerPayload = signer.toPayload();
        }

        const newState: LoginState = {
            method: LoginMethod.NOSTRCONNECT,
            loggedIn: true,
            data: {
                nostrconnect: {
                    signer: signerPayload
                }
            }
        };
        loginState.set(newState);
        saveLoginState(newState);

        return true;
    } catch (error) {
        console.error('Error logging in with NostrConnect:', error);
        return false;
    }
}


/**
 * Cancel an active nostrconnect connection attempt
 */
export function cancelNostrConnectAttempt(): void {
    const status = get(connectStatus);

    if (status.subscription) {
        status.subscription.stop();
    }

    connectStatus.set({
        status: 'idle'
    });
}

/**
 * Generate a random string of specified length
 */
function generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Initialize signer based on saved login state
 */
export async function initializeSigner(): Promise<boolean> {
    if (!browser) {
        return false;
    }

    // Get the current login state
    const state = get(loginState);
    logDebug('Initializing signer with state:', state);

    // If not logged in according to store, check localStorage as a backup
    if (!state.loggedIn) {
        const savedState = localStorage.getItem(LOGIN_STATE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                if (parsedState.loggedIn) {
                    loginState.set(parsedState);
                    logDebug('Restored login state from localStorage:', parsedState);
                    // Continue with the restored state
                    return await initializeSignerFromState(parsedState);
                }
            } catch (error) {
                console.error('Error parsing login state from localStorage:', error);
            }
        }
        return false;
    }

    // If we have a logged in state, initialize the appropriate signer
    return await initializeSignerFromState(state);
}

/**
 * Helper function to initialize signer from a specific state
 */
async function initializeSignerFromState(state: LoginState): Promise<boolean> {
    if (!state.loggedIn) {
        return false;
    }

    try {
        switch (state.method) {
            case LoginMethod.EXTENSION:
                return await loginWithExtension();

            case LoginMethod.NSEC:
                if (state.data?.nsec) {
                    return await loginWithNsec(state.data.nsec);
                }
                break;

            case LoginMethod.BUNKER:
                if (state.data?.bunkerUrl) {
                    return await loginWithBunker(state.data.bunkerUrl);
                }
                break;

            case LoginMethod.NOSTRCONNECT:
                if (state.data?.nostrconnect) {
                    const { signer } = state.data.nostrconnect;
                    if (signer) {
                        const signerObject = await NDKNip46Signer.fromPayload(signer, ndk);
                        return await loginWithNostrConnect(signerObject);
                    }
                }
                break;

            default:
                logDebug('Unknown login method:', state.method);
                return false;
        }
    } catch (error) {
        console.error('Error initializing signer:', error);
        // Reset login state on error
        logout();
        return false;
    }

    return false;
}

/**
 * Log out the current user
 */
export function logout(): void {
    // Clear NDK signer
    ndk.signer = undefined;

    // Reset login state
    loginState.set(defaultState);

    // Clear login state from localStorage
    if (browser) {
        localStorage.removeItem(LOGIN_STATE_KEY);
    }

    logDebug('User logged out');
}

/**
 * Check if user is currently logged in
 */
export function isLoggedIn(): boolean {
    return get(loginState).loggedIn;
} 