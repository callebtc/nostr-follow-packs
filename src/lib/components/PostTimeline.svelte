<script lang="ts">
  import { onMount } from 'svelte';
  import { ndk } from '$lib/nostr/ndk';
  import { getRelativeTime } from '$lib/utils/date';
  import type { FollowListEntry } from '$lib/types/follow-list';
  import PublicKeyDisplay from '$lib/components/PublicKeyDisplay.svelte';
  import FollowButton from '$lib/components/FollowButton.svelte';

  export let pubkeys: string[] = [];
  export let entries: FollowListEntry[] = [];
  
  let posts: any[] = [];
  let loading = true;
  let error = false;
  
  // Create a map of pubkeys to profile info for quick lookups
  const pubkeyToProfile = new Map<string, FollowListEntry>();
  
  onMount(async () => {
    try {
      if (!pubkeys.length) {
        posts = [];
        loading = false;
        return;
      }
      
      // Build profile lookup map
      entries.forEach(entry => {
        pubkeyToProfile.set(entry.pubkey, entry);
      });
      
      // Fetch kind 1 (text notes) events from the specified pubkeys
      const filter = { 
        kinds: [1],
        authors: pubkeys,
        limit: 50,
      };
      
      const events = await ndk.fetchEvents(filter);
      const eventsArray = Array.from(events);
      
      // Process the events into post objects
      posts = eventsArray.map(event => {
        // Get the profile info for this author
        const profile = pubkeyToProfile.get(event.pubkey) || {
          pubkey: event.pubkey,
          name: 'Unknown',
          picture: ''
        };
        
        // Extract hashtags
        const tags = event.tags || [];
        const hashtags = tags
          .filter(tag => tag[0] === 't')
          .map(tag => tag[1]);
          
        // Extract referenced events (e tags)
        const references = tags
          .filter(tag => tag[0] === 'e')
          .map(tag => ({
            id: tag[1],
            relay: tag[2] || '',
            marker: tag[3] || '',
          }));

        // if it has references, skip this post
        if (references.length > 0) {
          return null;
        }
        
        // Format the post object
        return {
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
          profile,
          hashtags,
          references
        };
      });

      // remove null posts
      posts = posts.filter(post => post !== null);
      
      // Sort by created_at (newest first)
      posts.sort((a, b) => b.created_at - a.created_at);
      
    } catch (err) {
      console.error('Error fetching posts:', err);
      error = true;
    } finally {
      loading = false;
    }
  });
  
  // Function to process content and render links and images
  function processContent(content: string) {
    // Replace URLs with anchor tags
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let processedContent = content.replace(urlRegex, (url) => {
      // Check if it's an image URL
      const isImage = /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(url);
      if (isImage) {
        return `<img src="${url}" alt="Post image" class="mt-2 rounded-lg max-w-full">`;
      }
      // Otherwise, it's a regular link
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`;
    });
    
    // Replace newlines with <br> tags
    processedContent = processedContent.replace(/\n/g, '<br>');
    
    return processedContent;
  }
</script>

<div class="bg-white rounded-lg shadow-sm overflow-hidden timeline-container mx-auto">
  <!-- Loading state -->
  {#if loading}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  
  <!-- Error state -->
  {:else if error}
    <div class="p-6 text-center text-red-500">
      There was an error loading the posts. Please try again later.
    </div>
  
  <!-- Empty state -->
  {:else if posts.length === 0}
    <div class="p-6 text-center text-gray-500">
      No posts found from users in this follow list.
    </div>
  
  <!-- Posts timeline -->
  {:else}
    <ul class="divide-y divide-gray-200">
      {#each posts as post}
        <li class="p-4 sm:p-6">
          <!-- Post header with user info -->
          <div class="flex items-start mb-3">
            <img 
              src={post.profile.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
              alt={post.profile.name || 'User'} 
              class="w-10 h-10 rounded-full mr-4"
            />
            
            <div class="flex-grow">
              <h3 class="text-lg font-medium text-gray-900">
                {post.profile.name || 'Unknown User'}
                {#if post.profile.nip05}
                  <span class="text-xs text-gray-500 hover:text-gray-700 transition">
                    {post.profile.nip05}
                  </span>
                {/if}
              </h3>
              <span class="text-xs text-gray-500">
                <PublicKeyDisplay pubkey={post.pubkey} /> · {getRelativeTime(post.created_at)}
              </span>
            </div>
            
            <!-- Follow button -->
            <div>
              <FollowButton entry={post.profile} />
            </div>
          </div>
          
          <!-- Post content -->
          <div class="text-gray-700 mb-3">
            {@html processContent(post.content)}
          </div>
          
          <!-- Hashtags -->
          {#if post.hashtags && post.hashtags.length > 0}
            <div class="flex flex-wrap gap-2 mt-2">
              {#each post.hashtags as tag}
                <span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  #{tag}
                </span>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Ensure images don't overflow their container */
  :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin-top: 0.5rem;
  }

  .timeline-container {
    max-width: 800px;
    overflow-y: auto;
  }
</style> 