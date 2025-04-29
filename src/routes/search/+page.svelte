<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { searchFollowLists } from '$lib/services/follow-list.service';
  import { searchUsers } from '$lib/services/vertex-search';
  import { getRelativeTime } from '$lib/utils/date';
  import type { FollowList } from '$lib/types/follow-list';
  import type { VertexSearchResult } from '$lib/services/vertex-search';
  
  // Get query from URL
  let searchQuery = '';
  let activeTab = 'packs'; // Default tab: 'packs' or 'users'
  let loading = true;
  
  // Search results
  let packResults: FollowList[] = [];
  let userResults: VertexSearchResult[] = [];
  let packLoading = true;
  let userLoading = true;
  let error = false;
  
  // Perform search with current query
  async function performSearch() {
    loading = true;
    error = false;
    
    try {
      // Search for packs
      packLoading = true;
      packResults = await searchFollowLists(searchQuery);
      packLoading = false;
      
      // Only search for users if on user tab or no pack results
      if (activeTab === 'users' || packResults.length === 0) {
        userLoading = true;
        userResults = await searchUsers(searchQuery);
        userLoading = false;
      }
      
      // If packs tab is active but no results, and user results exist, switch tab
      if (activeTab === 'packs' && packResults.length === 0 && userResults.length > 0) {
        activeTab = 'users';
      }
    } catch (err) {
      console.error('Search error:', err);
      error = true;
    } finally {
      loading = false;
    }
  }
  
  onMount(async () => {
    // Get the query from URL parameters
    searchQuery = $page.url.searchParams.get('q') || '';
    
    if (!searchQuery) {
      // If no query, redirect to home
      goto('/');
      return;
    }
    
    // Perform initial search
    await performSearch();
  });
  
  // Handle tab changes
  function setActiveTab(tab: string) {
    activeTab = tab;
    
    // Load user results if we haven't already
    if (tab === 'users' && userResults.length === 0 && !userLoading) {
      searchUsers(searchQuery).then(results => {
        userResults = results;
      }).catch(err => {
        console.error('Error searching users:', err);
      });
    }
  }
  
  // Handle search refinement
  async function handleSearchSubmit(e: Event) {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Update URL to reflect new search
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { replaceState: true });
      // Perform search with new query
      await performSearch();
    }
  }
</script>

<svelte:head>
  <title>Search: {searchQuery} - Following._</title>
</svelte:head>

<div class="container py-10">
  <div class="max-w-3xl mx-auto">
    <!-- Search header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Search Results</h1>
      
      <!-- Search form for refining search -->
      <form on:submit={handleSearchSubmit} class="mb-6">
        <div class="flex">
          <input
            type="search"
            bind:value={searchQuery}
            class="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Refine your search..."
          />
          <button
            type="submit"
            class="bg-purple-600 text-white px-6 py-2 rounded-r-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Search
          </button>
        </div>
      </form>
      
      <!-- Tab selector with result counts -->
      <div class="border-b border-gray-200">
        <div class="flex -mb-px">
          <button
            class="py-2 px-4 border-b-2 {activeTab === 'packs' ? 'border-purple-500 text-purple-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setActiveTab('packs')}
          >
            Follow Packs {packResults.length > 0 ? `(${packResults.length})` : ''}
          </button>
          <button
            class="py-2 px-4 border-b-2 {activeTab === 'users' ? 'border-purple-500 text-purple-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setActiveTab('users')}
          >
            Nostr Users {userResults.length > 0 ? `(${userResults.length})` : ''}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Error state -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-700">
        There was an error performing your search. Please try again.
      </div>
    <!-- Loading state -->
    {:else if loading}
      <div class="py-20 flex justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    <!-- No results state -->
    {:else if (activeTab === 'packs' && packResults.length === 0) || (activeTab === 'users' && userResults.length === 0)}
      <div class="bg-white rounded-lg shadow-sm p-8 text-center">
        <h2 class="text-xl font-medium text-gray-700 mb-2">No results found</h2>
        <p class="text-gray-500 mb-4">
          We couldn't find any {activeTab === 'packs' ? 'follow packs' : 'users'} matching "{searchQuery}".
        </p>
        <p class="text-gray-500">
          Try a different search term or <a href="/" class="text-purple-600 hover:text-purple-700">browse all follow packs</a>.
        </p>
      </div>
    <!-- Results -->
    {:else}
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        {#if activeTab === 'packs'}
          <!-- Follow Packs Results -->
          <ul class="divide-y divide-gray-200">
            {#each packResults as pack}
              <li>
                <a href="/d/{pack.id}" class="block hover:bg-gray-50">
                  <div class="p-4 sm:p-6">
                    <div class="flex items-start">
                      <!-- Pack image if available -->
                      {#if pack.coverImageUrl}
                        <div class="flex-shrink-0 mr-4">
                          <img 
                            src={pack.coverImageUrl} 
                            alt={pack.name}
                            class="w-16 h-16 object-cover rounded-md"
                          />
                        </div>
                      {/if}
                      
                      <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-medium text-gray-900 mb-1">{pack.name}</h3>
                        
                        <!-- Author info -->
                        <div class="flex items-center mb-2">
                          <img 
                            src={pack.authorPicture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                            alt={pack.authorName || 'Author'} 
                            class="w-5 h-5 rounded-full mr-2"
                          />
                          <span class="text-sm text-gray-600">{pack.authorName || 'Unknown'}</span>
                        </div>
                        
                        <!-- Description -->
                        {#if pack.description}
                          <p class="text-sm text-gray-500 line-clamp-2">{pack.description}</p>
                        {/if}
                        
                        <!-- Metadata -->
                        <p class="text-xs text-gray-500 mt-2">
                          {pack.entries.length} {pack.entries.length === 1 ? 'user' : 'users'} · 
                          updated {getRelativeTime(pack.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            {/each}
          </ul>
        {:else}
          <!-- User Results -->
          <ul class="divide-y divide-gray-200">
            {#if userLoading}
              <li class="p-6 text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                <p class="text-gray-500 mt-2">Loading users...</p>
              </li>
            {:else}
              {#each userResults as user}
                <li class="p-4 sm:p-6 flex items-center">
                  <img 
                    src={user.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                    alt={user.name || 'User'} 
                    class="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h3 class="text-lg font-medium text-gray-900">{user.name || 'Unknown User'}</h3>
                    <p class="text-sm text-gray-500 truncate">
                      {user.pubkey.substring(0, 10)}...{user.pubkey.substring(user.pubkey.length - 10)}
                    </p>
                  </div>
                </li>
              {/each}
            {/if}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Line clamp for pack descriptions */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
