import { browser } from '$app/environment';
import { loginState, initializeSigner } from '$lib/stores/login';
import { loadUser, user } from '$lib/stores/user';
import { get, writable } from 'svelte/store';
import { goto } from '$app/navigation';
import type { FollowList } from '$lib/types/follow-list';

// Debug logging
const DEBUG = true;
const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Filter Service]', ...args);
};

export const FILTER_PUBKEYS = [
    '414f438fe851a53ee2dc94883300d04f04165337141fc97563a5ee6542637660',
]

export function filterFollowLists(followLists: FollowList[]): FollowList[] {
    return followLists.filter((list) => {
        return !FILTER_PUBKEYS.includes(list.pubkey);
    });
}
