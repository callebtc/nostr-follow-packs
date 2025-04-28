<script lang="ts">
  import { user, followUsers, unfollowUsers } from '$lib/stores/user';
  import type { FollowListEntry } from '$lib/types/follow-list';

  export let entry: FollowListEntry;
  export let variant: 'primary' | 'outline' = 'primary';

  // Check if the current user is following a specific pubkey
  function isFollowing(pubkey: string): boolean {
    if (!$user) return false;
    if (!$user.following || typeof $user.following.has !== 'function') return false;
    return $user.following.has(pubkey);
  }

  // Handle following a user
  async function handleFollow() {
    if (!$user) return;
    
    try {
      await followUsers([entry.pubkey]);
    } catch (err) {
      console.error('Error following user:', err);
    }
  }

  // Handle unfollowing a user
  async function handleUnfollow() {
    if (!$user) return;
    
    try {
      await unfollowUsers([entry.pubkey]);
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  }
</script>

{#if $user}
  {#if isFollowing(entry.pubkey)}
    <button 
      on:click={handleUnfollow}
      class="btn btn-outline"
    >
      Following
    </button>
  {:else}
    <button 
      on:click={handleFollow}
      class="btn {variant === 'primary' ? 'btn-primary' : 'btn-outline'}"
    >
      Follow
    </button>
  {/if}
{/if} 