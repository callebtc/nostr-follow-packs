<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user, followUsers, unfollowUsers } from '$lib/stores/user';
  import { getFollowListById, getAuthorProfile, getProfileInfoForEntries } from '$lib/services/follow-list.service';
  import { hexToNpub } from '$lib/services/vertex-search';
  import { goto } from '$app/navigation';
  import type { FollowList, FollowListEntry } from '$lib/types/follow-list';
  import { getRelativeTime } from '$lib/utils/date';
  import PostTimeline from '$lib/components/PostTimeline.svelte';
  
  let followList: FollowList | null = null;
  let loading = true;
  let error = false;
  let success = '';
  let copying = '';
  let followingAll = false;
  let activeTab = 'people'; // Default active tab

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
      // Fetch profile information for each preview user in each list
      if (followList) {
        followList = await getAuthorProfile(followList);
        // Load profile info reactively
        getProfileInfoForEntries(followList).then(updatedList => {
          if (updatedList) {
            followList = updatedList;
          }
        });
      }
    } catch (err) {
      console.error('Error fetching follow list:', err);
      error = true;
    } finally {
      loading = false;
    }
  });

  // Check if the current user is the author of this follow list
  function isAuthor(): boolean {
    if (!$user || !followList) return false;
    return $user.pubkey === followList.pubkey;
  }

  // Handle edit button click
  function handleEdit() {
    if (!followList) return;
    goto(`/create?edit=${followList.eventId}`);
  }

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
      const result = await followUsers([entry.pubkey]);
      if (result) {
        success = `You are now following ${entry.name || 'this user'}`;
        setTimeout(() => { success = ''; }, 5000);
      }
    } catch (err) {
      console.error('Error following user:', err);
    }
  }

  // Handle unfollowing a user
  async function handleUnfollow(entry: FollowListEntry) {
    if (!$user) return;
    
    try {
      const result = await unfollowUsers([entry.pubkey]);
      if (result) {
        success = `You are no longer following ${entry.name || 'this user'}`;
        setTimeout(() => { success = ''; }, 5000);
      }
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  }

  // Handle follow all button click
  async function handleFollowAll() {
    if (!$user || !followList || followingAll) return;
    
    followingAll = true;
    let followedCount = 0;
    let pubkeysToFollow: string[] = [];
    try {
      for (const entry of followList.entries) {
        // Skip already followed users
        if (isFollowing(entry.pubkey)) continue;

        pubkeysToFollow.push(entry.pubkey);
      }

      if (pubkeysToFollow.length > 0) {
        const result = await followUsers(pubkeysToFollow);
        if (result) {
          followedCount = pubkeysToFollow.length;
        }
      }
      if (followedCount > 0) {
        success = `You are now following ${followedCount} new user${followedCount === 1 ? '' : 's'} from this list`;
        setTimeout(() => { success = ''; }, 5000);
      } else {
        success = 'You were already following all users in this list';
        setTimeout(() => { success = ''; }, 5000);
      }
    } catch (err) {
      console.error('Error in follow all:', err);
    } finally {
      followingAll = false;
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

  function setActiveTab(tab: string) {
    activeTab = tab;
  }
</script>

<div class="container py-10 people-container">
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
              <span class="text-gray-600">Created by {followList.authorName || 'Unknown'} · {getRelativeTime(followList.createdAt)}</span>
            </div>
          {/if}
        </div>
        
        <div class="flex space-x-2">
          {#if isAuthor()}
            <button on:click={handleEdit} class="btn btn-primary">Edit List</button>
          {/if}
          {#if $user}
            <button 
              on:click={handleFollowAll} 
              disabled={followingAll}
              class="btn btn-primary {followingAll ? 'opacity-70' : ''}"
            >
              {followingAll ? 'Following...' : 'Follow All'}
            </button>
          {/if}
          <a href="/" class="btn btn-secondary">Back to Home</a>
        </div>
      </div>
    </div>
    
    <!-- Success message -->
    {#if success}
      <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-6 text-green-700">
        {success}
      </div>
    {/if}
    
    <!-- Description -->
    {#if followList.description}
      <div class="mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <p class="text-gray-700">{followList.description}</p>
      </div>
    {/if}
    
    <!-- Tab selector -->
    <div class="mb-6 bg-white rounded-lg shadow-sm overflow-hidden people-container">
      <div class="grid grid-cols-2 border-b border-gray-200">
        <button 
          class="py-4 px-6 text-center text-gray-700 {activeTab === 'people' ? 'font-bold border-b-2 border-purple-500' : 'font-medium'}"
          on:click={() => setActiveTab('people')}
        >
          People
        </button>
        <button 
          class="py-4 px-6 text-center text-gray-700 {activeTab === 'posts' ? 'font-bold border-b-2 border-purple-500' : 'font-medium'}"
          on:click={() => setActiveTab('posts')}
        >
          Posts
        </button>
      </div>
    </div>
    
    {#if activeTab === 'people'}
      <!-- User list -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden people-container">
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
                  <h3 class="text-lg font-medium text-gray-900">{entry.name || 'Unknown User'}
                    {#if entry.nip05}
                      <span class="text-xs text-gray-500 hover:text-gray-700 transition">
                        {entry.nip05}
                      </span>
                    {/if}
                  </h3>
                  <button 
                    on:click={() => copyNpub(entry.pubkey)}
                    class="text-xs text-gray-500 hover:text-gray-700 transition"
                  >
                    {#if copying === entry.pubkey}
                      <span class="text-green-600">Copied!</span>
                    {:else}
                      {entry.pubkey.substring(0, 8)}...{entry.pubkey.substring(entry.pubkey.length - 8)}
                    {/if}
                  </button>
                  {#if entry.bio}
                    <p class="text-sm font-normal text-gray-600 mt-1">{entry.bio.length > 100 ? entry.bio.substring(0, 100) + '...' : entry.bio}</p>
                  {/if}
                </div>
              </div>
              
              {#if $user}
                {#if isFollowing(entry.pubkey)}
                  <button 
                    on:click={() => handleUnfollow(entry)}
                    class="btn btn-outline"
                  >
                    Following
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
    {:else}
      <!-- Post timeline -->
      <PostTimeline pubkeys={followList.entries.map(entry => entry.pubkey)} entries={followList.entries} />
    {/if}
  {/if}
</div> 

<style>
  .people-container {
    max-width: 800px;
    margin: 0 auto;
  }
</style>