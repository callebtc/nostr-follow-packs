<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user, followUser } from '$lib/stores/user';
  import { getFollowListById } from '$lib/services/follow-list.service';
  import { hexToNpub } from '$lib/services/vertex-search';
  import type { FollowList, FollowListEntry } from '$lib/types/follow-list';

  let followList: FollowList | null = null;
  let loading = true;
  let error = false;
  let success = '';
  let copying = '';

  onMount(async () => {
    try {
      // Get the list ID from the URL
      const listId = $page.params.id;
      if (!listId) {
        error = true;
        return;
      }

      // Fetch the follow list
      followList = await getFollowListById(listId);
      if (!followList) {
        error = true;
      }
    } catch (err) {
      console.error('Error fetching follow list:', err);
      error = true;
    } finally {
      loading = false;
    }
  });

  // Check if the current user is following a specific pubkey
  function isFollowing(pubkey: string): boolean {
    if (!$user) return false;
    if (!$user.following || typeof $user.following.has !== 'function') return false;
    return $user.following.has(pubkey);
  }

  // Handle following a user
  async function handleFollow(entry: FollowListEntry) {
    if (!$user) return;
    
    try {
      const result = await followUser(entry.pubkey);
      if (result) {
        success = `You are now following ${entry.name || 'this user'}`;
        setTimeout(() => { success = ''; }, 3000);
      }
    } catch (err) {
      console.error('Error following user:', err);
    }
  }

  // Copy npub to clipboard
  async function copyNpub(pubkey: string) {
    try {
      copying = pubkey;
      const npub = await hexToNpub(pubkey);
      if (npub) {
        await navigator.clipboard.writeText(npub);
        setTimeout(() => { copying = ''; }, 1500);
      }
    } catch (err) {
      console.error('Error copying npub:', err);
      copying = '';
    }
  }
</script>

<div class="container py-10">
  <!-- Loading state -->
  {#if loading}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  
  <!-- Error state -->
  {:else if error || !followList}
    <div class="bg-white rounded-lg shadow-sm p-8 text-center">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Follow List Not Found</h2>
      <p class="text-gray-600 mb-6">The follow list you're looking for doesn't exist or could not be loaded.</p>
      <a href="/" class="btn btn-primary">Back to Home</a>
    </div>
  
  <!-- Success state -->
  {:else}
    <!-- Header with cover image -->
    <div class="mb-8 relative">
      {#if followList.coverImageUrl}
        <div class="h-60 rounded-lg overflow-hidden">
          <img 
            src={followList.coverImageUrl} 
            alt={followList.name} 
            class="w-full h-full object-cover"
          />
        </div>
      {/if}
      
      <div class="mt-6 flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{followList.name}</h1>
          
          {#if followList.authorName || followList.authorPicture}
            <div class="flex items-center mt-2">
              <img 
                src={followList.authorPicture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                alt={followList.authorName || 'Author'} 
                class="w-6 h-6 rounded-full mr-2"
              />
              <span class="text-gray-600">Created by {followList.authorName || 'Unknown'}</span>
            </div>
          {/if}
        </div>
        
        <a href="/" class="btn btn-secondary">Back to Home</a>
      </div>
    </div>
    
    <!-- Success message -->
    {#if success}
      <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-6 text-green-700">
        {success}
      </div>
    {/if}
    
    <!-- User list -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden">
      <ul class="divide-y divide-gray-200">
        {#each followList.entries as entry}
          <li class="p-4 sm:p-6 flex items-center justify-between">
            <div class="flex items-center">
              <img 
                src={entry.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                alt={entry.name || 'User'} 
                class="w-10 h-10 rounded-full mr-4"
              />
              
              <div>
                <h3 class="text-lg font-medium text-gray-900">{entry.name || 'Unknown User'}</h3>
                <button 
                  on:click={() => copyNpub(entry.pubkey)}
                  class="text-sm text-gray-500 hover:text-gray-700 transition"
                >
                  {#if copying === entry.pubkey}
                    <span class="text-green-600">Copied!</span>
                  {:else}
                    {entry.pubkey.substring(0, 8)}...{entry.pubkey.substring(entry.pubkey.length - 8)}
                  {/if}
                </button>
              </div>
            </div>
            
            {#if $user}
              {#if isFollowing(entry.pubkey)}
                <button class="btn btn-outline" disabled>
                  Already Following
                </button>
              {:else}
                <button 
                  on:click={() => handleFollow(entry)}
                  class="btn btn-primary"
                >
                  Follow
                </button>
              {/if}
            {/if}
          </li>
        {/each}
        
        {#if followList.entries.length === 0}
          <li class="p-6 text-center text-gray-500">
            This follow list doesn't contain any users.
          </li>
        {/if}
      </ul>
    </div>
  {/if}
</div> 