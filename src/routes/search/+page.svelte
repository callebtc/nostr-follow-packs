<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Get query from URL
  let searchQuery = '';
  let activeTab = 'packs'; // Default tab: 'packs' or 'users'
  let loading = true;
  
  // These will be implemented later
  let packResults = [];
  let userResults = [];
  
  onMount(() => {
    // Get the query from URL parameters
    searchQuery = $page.url.searchParams.get('q') || '';
    
    if (!searchQuery) {
      // If no query, redirect to home
      goto('/');
      return;
    }
    
    // For now, just simulate a loading state
    setTimeout(() => {
      loading = false;
    }, 1000);
    
    // This will be replaced with actual search implementation
    console.log('Searching for:', searchQuery);
  });
  
  function setActiveTab(tab: string) {
    activeTab = tab;
  }
  
  function handleSearchSubmit(e: Event) {
    e.preventDefault();
    if (searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
      
      <!-- Tab selector -->
      <div class="border-b border-gray-200">
        <div class="flex -mb-px">
          <button
            class="py-2 px-4 border-b-2 {activeTab === 'packs' ? 'border-purple-500 text-purple-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setActiveTab('packs')}
          >
            Follow Packs
          </button>
          <button
            class="py-2 px-4 border-b-2 {activeTab === 'users' ? 'border-purple-500 text-purple-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setActiveTab('users')}
          >
            Nostr Users
          </button>
        </div>
      </div>
    </div>
    
    <!-- Loading state -->
    {#if loading}
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
    <!-- Results - to be implemented -->
    {:else}
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        {#if activeTab === 'packs'}
          <!-- Follow Packs results will go here -->
          <div class="p-6">
            <p class="text-gray-500 text-center">Follow Pack search results will be displayed here.</p>
          </div>
        {:else}
          <!-- User results will go here -->
          <div class="p-6">
            <p class="text-gray-500 text-center">User search results will be displayed here.</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
