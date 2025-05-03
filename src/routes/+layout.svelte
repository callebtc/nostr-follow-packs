<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/user';
  import { goto } from '$app/navigation';
  import { logoutUser } from '$lib/services/logout';
  import { initializeAuth } from '$lib/services/auth';
  import LoginButton from '$lib/components/LoginButton.svelte';
  import { browser } from '$app/environment';
  import ProfileImage from '$lib/components/ProfileImage.svelte';

  let showUserMenu = false;
  let showLogoutConfirm = false;
  let loggingOut = false;
  let authInitialized = false;

  onMount(async () => {
    if (browser && !authInitialized) {
      authInitialized = true;
      
      // Initialize auth using our centralized service
      await initializeAuth();
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (showUserMenu && !(e.target as HTMLElement).closest('.user-menu-container')) {
        showUserMenu = false;
      }
    });
  });
  
  function toggleUserMenu(e: MouseEvent) {
    e.stopPropagation();
    showUserMenu = !showUserMenu;
  }
  
  function navigateToSettings() {
    showUserMenu = false;
    goto('/settings');
  }

  function handleLogout() {
    showUserMenu = false;
    showLogoutConfirm = true;
  }

  async function confirmLogout() {
    loggingOut = true;
    
    try {
      // Use the centralized logout service
      await logoutUser();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      loggingOut = false;
      showLogoutConfirm = false;
    }
  }

  function cancelLogout() {
    showLogoutConfirm = false;
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
              <ProfileImage 
                src={$user.picture} 
                alt={$user.name || 'User'} 
                size="md"
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
                <button
                  on:click={handleLogout}
                  class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <LoginButton />
        {/if}
      </div>
    </div>
  </header>

  <!-- Logout Confirmation Modal -->
  {#if showLogoutConfirm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Logout Confirmation</h3>
        <p class="text-gray-700 mb-6">
          Are you sure you want to log out? You will need to log in again to access your account.
        </p>
        <div class="flex justify-end space-x-3">
          <button 
            on:click={cancelLogout} 
            class="btn btn-secondary"
            disabled={loggingOut}
          >
            Cancel
          </button>
          <button 
            on:click={confirmLogout} 
            class="btn btn-error"
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <main class="flex-1">
    <slot />
  </main>

  <footer class="bg-white border-t">
    <div class="container py-6 text-center text-gray-500">
      <p><strong>Following._</strong> is open source and made by <a href="https://github.com/callebtc/nostr-follow-packs" class="text-purple-600 hover:text-purple-700">calle</a> with love.</p>
    </div>
  </footer>
</div> 