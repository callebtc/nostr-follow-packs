<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/user';
  import { searchUsers, npubToHex, isValidNpub } from '$lib/services/vertex-search';
  import { publishFollowList } from '$lib/services/follow-list.service';
  import { getProfileByPubkey } from '$lib/stores/user';
  import type { VertexSearchResult } from '$lib/services/vertex-search';
  import type { FollowListEntry } from '$lib/types/follow-list';

  // Debug logging
  const DEBUG = true;
  const logDebug = (...args: any[]) => {
    if (DEBUG) console.log('[Create Page]', ...args);
  };

  // Form state
  let name = '';
  let coverImageUrl = '';
  let searchQuery = '';
  let searching = false;
  let searchResults: VertexSearchResult[] = [];
  let selectedEntries: FollowListEntry[] = [];
  let submitting = false;
  let error = '';
  
  // Validation state
  let nameValid = true;
  let entriesValid = true;
  
  // Handle user search
  async function handleSearch() {
    if (!searchQuery || searchQuery.length < 3) return;
    
    logDebug('Searching for:', searchQuery);
    searching = true;
    searchResults = [];
    error = '';
    
    try {
      // Check if the input is an npub
      if (isValidNpub(searchQuery)) {
        logDebug('Input is an npub, converting to hex');
        const hexPubkey = await npubToHex(searchQuery);
        
        if (hexPubkey) {
          logDebug('Converted npub to hex:', hexPubkey);
          
          // Fetch profile data
          try {
            logDebug('Fetching profile for npub');
            const profile = await getProfileByPubkey(hexPubkey);
            logDebug('Fetched profile:', profile);
            
            searchResults = [{
              pubkey: hexPubkey,
              rank: 1,
              name: profile.name,
              picture: profile.picture
            }];
          } catch (profileErr) {
            logDebug('Error fetching profile for npub:', profileErr);
            // Still add the result even without profile
            searchResults = [{
              pubkey: hexPubkey,
              rank: 1
            }];
          }
        } else {
          logDebug('Failed to convert npub');
          error = 'Invalid npub format';
        }
      } else {
        // Search by username using Vertex
        logDebug('Searching by username with Vertex');
        searchResults = await searchUsers(searchQuery);
        logDebug('Search results:', searchResults);
      }
    } catch (err) {
      console.error('Search error:', err);
      logDebug('Search error:', err);
      error = `Search error: ${err.message || 'Unknown error'}`;
    } finally {
      searching = false;
    }
    
    logDebug('Final search results:', searchResults);
  }
  
  // Add a search result to the selected entries
  function addEntry(result: VertexSearchResult) {
    // Check if already added
    if (selectedEntries.some(entry => entry.pubkey === result.pubkey)) {
      logDebug('Entry already in list:', result.pubkey);
      return;
    }
    
    logDebug('Adding entry to list:', result);
    
    // Add to selections
    selectedEntries = [
      ...selectedEntries, 
      {
        pubkey: result.pubkey,
        name: result.name,
        picture: result.picture
      }
    ];
    
    // Clear search
    searchQuery = '';
    searchResults = [];
  }
  
  // Remove a selected entry
  function removeEntry(index: number) {
    selectedEntries = selectedEntries.filter((_, i) => i !== index);
  }
  
  // Handle form submission
  async function handleSubmit() {
    // Reset validation
    nameValid = !!name.trim();
    entriesValid = selectedEntries.length > 0;
    
    logDebug('Form submission - validation:', { nameValid, entriesValid });
    
    // Check validation
    if (!nameValid || !entriesValid) {
      error = 'Please fix the validation errors and try again.';
      logDebug('Validation failed:', error);
      return;
    }
    
    submitting = true;
    error = '';
    
    logDebug('Publishing follow list:', { name, entries: selectedEntries.length });
    
    try {
      // Publish the follow list
      const id = await publishFollowList(name, coverImageUrl, selectedEntries);
      logDebug('Published with ID:', id);
      
      if (id) {
        // Navigate to the new follow list
        logDebug('Redirecting to new follow list page');
        goto(`/${id}`);
      } else {
        error = 'Failed to publish follow list. Please try again.';
        logDebug('Publish failed - no ID returned');
      }
    } catch (err) {
      console.error('Error publishing follow list:', err);
      logDebug('Publish error:', err);
      error = `Error publishing: ${err.message || 'An unknown error occurred'}`;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="container py-10">
  <div class="max-w-2xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Create Follow List</h1>
      <a href="/" class="btn btn-secondary">Cancel</a>
    </div>
    
    {#if !$user}
      <div class="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
        <h2 class="text-xl font-medium text-yellow-800 mb-2">Login Required</h2>
        <p class="text-yellow-700 mb-4">
          You need to be logged in with a NIP-07 extension to create a follow list.
        </p>
        <a href="/" class="btn btn-primary">Back to Home</a>
      </div>
    {:else}
      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-700">
          {error}
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit} class="bg-white shadow-sm rounded-lg overflow-hidden">
        <div class="p-6 border-b">
          <h2 class="text-xl font-medium mb-6">Follow List Details</h2>
          
          <!-- Name field -->
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              List Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              bind:value={name}
              on:blur={() => nameValid = !!name.trim()}
              class="w-full px-3 py-2 border {!nameValid ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              placeholder="E.g., Nostr Developers to Follow"
            />
            {#if !nameValid}
              <p class="mt-1 text-sm text-red-600">Name is required</p>
            {/if}
          </div>
          
          <!-- Cover image URL field -->
          <div class="mb-6">
            <label for="coverImageUrl" class="block text-sm font-medium text-gray-700 mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              id="coverImageUrl"
              bind:value={coverImageUrl}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              placeholder="https://example.com/image.jpg"
            />
            <p class="mt-1 text-xs text-gray-500">Optional: URL to an image that represents this list</p>
          </div>
          
          {#if coverImageUrl}
            <div class="mb-6">
              <p class="block text-sm font-medium text-gray-700 mb-2">Cover Image Preview</p>
              <div class="h-36 bg-gray-100 rounded-md overflow-hidden">
                <img 
                  src={coverImageUrl} 
                  alt="Cover Preview" 
                  class="w-full h-full object-cover" 
                  on:error={(e) => e.target.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                />
              </div>
            </div>
          {/if}
        </div>
        
        <div class="p-6 border-b">
          <h2 class="text-xl font-medium mb-6">Add Users to Follow List</h2>
          
          <!-- Search field -->
          <div class="mb-4">
            <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
              Search for Nostr Users
            </label>
            <div class="flex">
              <input
                type="text"
                id="search"
                bind:value={searchQuery}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter username or npub"
                on:keydown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                on:click={handleSearch}
                disabled={searching || searchQuery.length < 3}
                class="px-4 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Search by username or paste a nostr npub (starting with npub1...)
            </p>
            
            {#if error}
              <p class="mt-2 text-sm text-red-600">{error}</p>
            {/if}
          </div>
          
          <!-- Search results -->
          {#if searchResults.length > 0}
            <div class="mb-6 border border-gray-200 rounded-md overflow-hidden">
              <ul class="divide-y divide-gray-200">
                {#each searchResults as result}
                  <li class="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div class="flex items-center">
                      <img 
                        src={result.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                        alt={result.name || 'User'} 
                        class="w-8 h-8 rounded-full mr-3"
                      />
                      <div>
                        <p class="font-medium">{result.name || 'Unknown User'}</p>
                        <p class="text-xs text-gray-500">{result.pubkey.substring(0, 8)}...{result.pubkey.substring(result.pubkey.length - 8)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      on:click={() => addEntry(result)}
                      class="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Add to List
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          
          <!-- Selected entries -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-lg font-medium">Selected Users ({selectedEntries.length})</h3>
              {#if !entriesValid}
                <p class="text-sm text-red-600">Add at least one user to your list</p>
              {/if}
            </div>
            
            {#if selectedEntries.length === 0}
              <div class="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-gray-500">
                No users selected yet. Search for users to add them to your list.
              </div>
            {:else}
              <ul class="border border-gray-200 rounded-md divide-y divide-gray-200">
                {#each selectedEntries as entry, i}
                  <li class="p-3 flex items-center justify-between">
                    <div class="flex items-center">
                      <img 
                        src={entry.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                        alt={entry.name || 'User'} 
                        class="w-8 h-8 rounded-full mr-3"
                      />
                      <div>
                        <p class="font-medium">{entry.name || 'Unknown User'}</p>
                        <p class="text-xs text-gray-500">{entry.pubkey.substring(0, 8)}...{entry.pubkey.substring(entry.pubkey.length - 8)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      on:click={() => removeEntry(i)}
                      class="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
        
        <div class="p-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            class="btn btn-primary px-6 py-3 text-base {submitting ? 'opacity-70' : ''}"
          >
            {submitting ? 'Publishing...' : 'Publish Follow List'}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div> 