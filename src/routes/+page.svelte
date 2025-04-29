<script lang="ts">
  import { onMount } from 'svelte';
  import { user, loadUser } from '$lib/stores/user';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';

  import { getFollowLists, LIST_LIMIT, getAuthorProfile, getProfileInfoForEntries } from '$lib/services/follow-list.service';
  import type { FollowList } from '$lib/types/follow-list';
  import { getRelativeTime } from '$lib/utils/date';

  let followLists: FollowList[] = [];
  let loading = true;
  let loadingMore = false;
  let hasMoreLists = false;
  let filterUserFollows = false;

  async function loadFollowLists(until?: number) {
    try {

      let lists: FollowList[] = [];
      if (filterUserFollows) {
        await loadUser();
        const ourUser = get(user);
        if (ourUser) {
          const follows = ourUser.following;
          const followsArray = follows ? Array.from(follows) : [];
          followsArray.push(ourUser.pubkey);
          lists = await getFollowLists(LIST_LIMIT, undefined, until, followsArray);
        } else {
          lists = await getFollowLists(LIST_LIMIT, undefined, until);
        }
      } else {
        lists = await getFollowLists(LIST_LIMIT, undefined, until);
      }
      
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

  async function loadAllFollowLists() {
    // Load follow lists first and render them immediately
    followLists = await loadFollowLists();
      loading = false;
      
      // Then load author profiles for each list one by one
      for (let i = 0; i < followLists.length; i++) {
        // Load author profile
        const listWithAuthor = await getAuthorProfile(followLists[i]);
        if (listWithAuthor) {
          followLists[i] = listWithAuthor;
          // Force reactivity by reassigning the array
          followLists = [...followLists];
        }
        
        // Load profile info for entries
        // Use a separate function to process each entry individually
        loadProfilesForList(i);
      }
  }

  onMount(async () => {
    try {
      // Load filter preference from localStorage
      if (typeof localStorage !== 'undefined') {
        const savedFilter = localStorage.getItem('filterUserFollows');
        if (savedFilter !== null) {
          filterUserFollows = savedFilter === 'true';
        }
      }
      
      await loadAllFollowLists();
    } catch (error) {
      console.error('Error fetching follow lists:', error);
      loading = false;
    }
  });
  
  // Function to load profiles for entries in a specific list
  async function loadProfilesForList(listIndex: number) {
    const list = followLists[listIndex];
    const maxEntries = 5; // Only load first 5 profiles
    
    // Load profiles one by one
    for (let i = 0; i < Math.min(list.entries.length, maxEntries); i++) {
      try {
        // Call getProfileInfoForEntries with a single entry index
        const updatedList = await getProfileInfoForEntries(
          { ...list, entries: [...list.entries] }, // Clone to avoid mutation
          undefined, // We're using entryIndex instead
          i  // Process this specific index
        );
        
        if (updatedList) {
          // Update just this one entry in our local list
          followLists[listIndex].entries[i] = updatedList.entries[i];
          // Force reactivity by reassigning the array
          followLists = [...followLists];
        }
      } catch (error) {
        console.error(`Error loading profile for entry ${i} in list ${listIndex}:`, error);
      }
    }
  }

  function handleCreateClick() {
    goto('/create');
  }

  async function handleFilterUserFollows() {
    // Save filter preference to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('filterUserFollows', filterUserFollows.toString());
    }
    
    followLists = [];
    loading = true;
    await loadAllFollowLists();
    loading = false;
  }
</script>

<div class="container py-10">
  <!-- Hero section -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Nostr Follow Packs</h1>
    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
      Discover and share curated lists of Nostr users to follow. Find the users that are most interesting to you or create your own lists.
    </p>
    
    <div class="mt-8">
      <button 
        on:click={handleCreateClick}
        class="btn btn-primary text-lg px-6 py-3 {!$user ? 'btn-disabled' : ''}"
        disabled={!$user}
      >
        Create New Follow Pack
      </button>
      
      {#if !$user}
        <p class="text-sm text-gray-500 mt-4">Please log in to create a follow pack or to filter packs by users you follow.</p>
      {/if}
    </div>
  </div>

  <!-- Browse section -->
  <div class="mt-16">
    <!-- Filter section (moved to top right) -->
    {#if $user}
      <div class="flex justify-end mb-6">
        <label class="flex items-center cursor-pointer">
          <div class="font-medium text-gray-500">
            Filter packs by users I follow
          </div>
          <div class="relative ml-4">
            <input type="checkbox" class="sr-only" bind:checked={filterUserFollows} on:change={handleFilterUserFollows} />
            <div class="block w-12 h-6 rounded-full bg-gray-200"></div>
            <div class="dot absolute left-1 top-0.5 {filterUserFollows ? 'bg-purple-600' : 'bg-white'} w-5 h-5 rounded-full transition-transform duration-300 ease-in-out" 
                 class:translate-x-5={filterUserFollows}></div>
            <div class="absolute inset-0 rounded-full transition-colors duration-300 ease-in-out -z-10"></div>
          </div>
        </label>
      </div>
    {/if}
    
    {#if loading}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Array(6) as _, i}
          <div class="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
            <!-- Skeleton cover image -->
            <div class="h-36 bg-gray-200"></div>
            
            <!-- Skeleton content -->
            <div class="p-4">
              <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              
              <!-- Skeleton author info -->
              <div class="flex items-center mb-3">
                <div class="w-5 h-5 rounded-full bg-gray-200 mr-2"></div>
                <div class="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              
              <!-- Skeleton user avatars -->
              <div class="flex -space-x-2 overflow-hidden mt-4">
                {#each Array(5) as _, j}
                  <div class="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"></div>
                {/each}
              </div>
              
              <div class="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if followLists.length === 0}
      <div class="bg-white p-8 rounded-lg shadow-sm text-center">
        <p class="text-gray-600">No follow lists found. Be the first to create one!</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each followLists as list}
          <a 
            href="/d/{list.id}" 
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
              <div class="flex items-center mb-3">
                <img 
                  src={list.authorPicture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                  alt={list.authorName || 'Author'} 
                  class="w-5 h-5 rounded-full object-cover mr-2"
                />
                <span class="text-sm text-gray-600">{list.authorName || 'Unknown User'}</span>
              </div>
              
              <!-- Preview of users in the list -->
              <div class="flex -space-x-2 overflow-hidden mt-4">
                {#each list.entries.slice(0, 5) as entry}
                  <img 
                    src={entry.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                    alt={entry.name || 'User'} 
                    class="w-8 h-8 rounded-full object-cover border-2 border-white"
                    style="margin-top: 0px;"
                  />
                {/each}
                
                {#if list.entries.length > 5}
                  <div class="w-8 h-8 rounded-full object-cover bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                    +{list.entries.length - 5}
                  </div>
                {/if}
              </div>
              
              <p class="text-sm text-gray-500 mt-2">
                {list.entries.length} {list.entries.length === 1 ? 'user' : 'users'} · updated {getRelativeTime(list.createdAt)}
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
