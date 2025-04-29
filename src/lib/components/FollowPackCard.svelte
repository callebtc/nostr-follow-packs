<script lang="ts">
  import { getRelativeTime } from '$lib/utils/date';
  import type { FollowList } from '$lib/types/follow-list';
  
  export let pack: FollowList;
  export let loading: boolean = false;
</script>

{#if loading}
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
{:else}
  <a href="/d/{pack.id}" class="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:scale-[1.02]">
    <!-- Cover image -->
    <div class="h-36 bg-gray-200">
      {#if pack.coverImageUrl}
        <img
          src={pack.coverImageUrl}
          alt={pack.name}
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
      <h3 class="text-lg font-semibold mb-2">{pack.name}</h3>
      
      <!-- Author info -->
      <div class="flex items-center mb-3">
        <img
          src={pack.authorPicture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
          alt={pack.authorName || 'Author'}
          class="w-5 h-5 rounded-full object-cover mr-2"
        />
        <span class="text-sm text-gray-600">{pack.authorName || 'Unknown User'}</span>
      </div>
      
      <!-- Preview of users in the list -->
      <div class="flex -space-x-2 overflow-hidden mt-4">
        {#each pack.entries.slice(0, 5) as entry}
          <img
            src={entry.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
            alt={entry.name || 'User'}
            class="w-8 h-8 rounded-full object-cover border-2 border-white"
            style="margin-top: 0px;"
          />
        {/each}
        
        {#if pack.entries.length > 5}
          <div class="w-8 h-8 rounded-full object-cover bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
            +{pack.entries.length - 5}
          </div>
        {/if}
      </div>
      
      <p class="text-sm text-gray-500 mt-2">
        {pack.entries.length} {pack.entries.length === 1 ? 'user' : 'users'} · updated {getRelativeTime(pack.createdAt)}
      </p>
    </div>
  </a>
{/if}
