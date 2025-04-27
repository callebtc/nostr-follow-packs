<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/user';
  import { goto } from '$app/navigation';
  import { getFollowLists, LIST_LIMIT, getAuthorProfile, getProfileInfoForEntries } from '$lib/services/follow-list.service';
  import type { FollowList } from '$lib/types/follow-list';
  import { getRelativeTime } from '$lib/utils/date';

  let followLists: FollowList[] = [];
  let loading = true;
  let loadingMore = false;
  let hasMoreLists = false;

  async function loadFollowLists(until?: number) {
    try {
      const lists = await getFollowLists(LIST_LIMIT, undefined, until);
      
      // Determine if we might have more lists
      hasMoreLists = lists.length >= LIST_LIMIT;
      
      return lists;
    } catch (error) {
      console.error('Error fetching follow lists:', error);
      return [];
    }
  }

  async function loadMore() {
    if (followLists.length === 0 || loadingMore) return;
    
    loadingMore = true;
    
    // Get the oldest list's timestamp
    const oldestList = followLists[followLists.length - 1];
    const until = oldestList.createdAt;
    
    // Load more lists
    const moreLists = await loadFollowLists(until);
    
    // Append new lists to existing ones, avoiding duplicates
    const newListIds = new Set(moreLists.map(list => list.id));
    const uniqueNewLists = moreLists.filter(list => !followLists.some(existing => existing.id === list.id));
    followLists = [...followLists, ...uniqueNewLists];
    
    loadingMore = false;
  }

  onMount(async () => {
    try {
      followLists = await loadFollowLists();
      for (let i = 0; i < followLists.length; i++) {
        followLists[i] = await getAuthorProfile(followLists[i]) || followLists[i];
        // Update the list with profile info and trigger reactivity
        getProfileInfoForEntries(followLists[i], 5).then(updatedList => {
          if (updatedList) {
            // Force update to specific index
            followLists[i] = updatedList;
            // Force reactivity by reassigning the array
            followLists = [...followLists];
          }
        });
      }
    } catch (error) {
      console.error('Error fetching follow lists:', error);
    } finally {
      loading = false;
    }
  });

  function handleCreateClick() {
    goto('/create');
  }
</script>

<div class="container py-10">
  <!-- Hero section -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Nostr Follow Lists</h1>
    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
      Discover and share curated lists of Nostr users to follow. Find the users that are most interesting to you or create your own lists.
    </p>
    
    <div class="mt-8">
      <button 
        on:click={handleCreateClick}
        class="btn btn-primary text-lg px-6 py-3 {!$user ? 'btn-disabled' : ''}"
        disabled={!$user}
      >
        Create New Follow List
      </button>
      
      {#if !$user}
        <p class="text-sm text-gray-500 mt-2">Please log in to create a follow list</p>
      {/if}
    </div>
  </div>
  
  <!-- Browse section -->
  <div class="mt-16">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Browse Follow Lists</h2>
    
    {#if loading}
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    {:else if followLists.length === 0}
      <div class="bg-white p-8 rounded-lg shadow-sm text-center">
        <p class="text-gray-600">No follow lists found. Be the first to create one!</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each followLists as list}
          <a 
            href="/e/{list.eventId}" 
            class="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:scale-[1.02]"
          >
            <!-- Cover image -->
            <div class="h-36 bg-gray-200">
              {#if list.coverImageUrl}
                <img 
                  src={list.coverImageUrl} 
                  alt={list.name} 
                  class="w-full h-full object-cover"
                />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-gray-400">
                  No cover image
                </div>
              {/if}
            </div>
            
            <!-- Content -->
            <div class="p-4">
              <h3 class="text-lg font-semibold mb-2">{list.name}</h3>
              
              <!-- Author info -->
              {#if list.authorName || list.authorPicture}
                <div class="flex items-center mb-3">
                  <img 
                    src={list.authorPicture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                    alt={list.authorName || 'Author'} 
                    class="w-5 h-5 rounded-full mr-2"
                  />
                  <span class="text-sm text-gray-600">{list.authorName || 'Unknown'}</span>
                </div>
              {/if}
              
              <!-- Preview of users in the list -->
              <div class="flex -space-x-2 overflow-hidden mt-4">
                {#each list.entries.slice(0, 5) as entry}
                  <img 
                    src={entry.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                    alt={entry.name || 'User'} 
                    class="w-8 h-8 rounded-full border-2 border-white"
                  />
                {/each}
                
                {#if list.entries.length > 5}
                  <div class="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                    +{list.entries.length - 5}
                  </div>
                {/if}
              </div>
              
              <p class="text-sm text-gray-500 mt-2">
                {list.entries.length} {list.entries.length === 1 ? 'user' : 'users'} · created {getRelativeTime(list.createdAt)}
              </p>
            </div>
          </a>
        {/each}
      </div>
      
      <!-- Pagination -->
      {#if hasMoreLists}
        <div class="mt-8 text-center">
          <button 
            on:click={loadMore}
            class="btn btn-outline btn-sm px-4 {loadingMore ? 'loading' : ''}"
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Discover more'}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
