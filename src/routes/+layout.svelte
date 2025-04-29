<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { user, loadUser, checkNip07Extension } from '$lib/stores/user';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let hasExtension = false;
  let showUserMenu = false;

  onMount(async () => {
    hasExtension = await checkNip07Extension();
    if (hasExtension) {
      await loadUser();
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (showUserMenu && !(e.target as HTMLElement).closest('.user-menu-container')) {
        showUserMenu = false;
      }
    });
  });

  function handleLogin() {
    if (!hasExtension) {
      alert('Please install a NIP-07 compatible browser extension like Alby or nos2x');
      return;
    }
    loadUser();
  }
  
  function toggleUserMenu(e: MouseEvent) {
    e.stopPropagation();
    showUserMenu = !showUserMenu;
  }
  
  function navigateToSettings() {
    showUserMenu = false;
    goto('/settings');
  }
</script>

<svelte:head>
  <title>Following._</title>
  <meta name="description" content="Create, share, and discover Nostr Follow Packs" />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <header class="bg-white shadow-sm">
    <div class="container py-4 flex justify-between items-center">
      <div class="flex items-center">
        <a class="hidden sm:inline"href="/"><img src="/farm.png" alt="Sheep" class="mx-auto mr-2" style="max-height: 40px;"></a> 
        <a href="/" class="text-2xl font-bold text-grey-600">Following._</a>
      </div>
      <div>
        {#if $user}
          <div class="relative user-menu-container">
            <button 
              on:click={toggleUserMenu}
              class="flex items-center space-x-2 focus:outline-none"
            >
              <img 
                src={$user.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                alt={$user.name || 'User'} 
                class="w-8 h-8 rounded-full"
              />
              <span class="font-medium">{$user.name || 'Anonymous'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            
            {#if showUserMenu}
              <div class="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <button
                  on:click={navigateToSettings}
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <button on:click={handleLogin} class="btn btn-primary mt-2">
            Login with Extension
          </button>
        {/if}
      </div>
    </div>
  </header>

  <main class="flex-1">
    <slot />
  </main>

  <footer class="bg-white border-t">
    <div class="container py-6 text-center text-gray-500">
      <p><strong>Following._</strong> is open source and made by <a href="https://github.com/callebtc/nostr-follow-list" class="text-purple-600 hover:text-purple-700">calle</a> with love.</p>
    </div>
  </footer>
</div> 