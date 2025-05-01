<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    loginWithExtension, 
    loginWithNsec, 
    loginWithBunker, 
    checkNip07Extension 
  } from '$lib/stores/login';
  import { loadUser } from '$lib/stores/user';

  export let isOpen = false;
  export let onClose = () => {};
  export let onLogin = () => {};

  let activeTab = 'extension';
  let nsec = '';
  let bunkerUrl = '';
  let isLoading = false;
  let isNip07Available = false;

  // Check if NIP-07 extension is available
  onMount(async () => {
    isNip07Available = await checkNip07Extension();
    // If NIP-07 is not available, default to NSEC tab
    if (!isNip07Available) {
      activeTab = 'nsec';
    }
  });

  async function handleExtensionLogin() {
    isLoading = true;
    try {
      const success = await loginWithExtension();
      if (success) {
        await loadUser();
        onLogin();
        onClose();
      }
    } catch (error) {
      console.error('Extension login failed:', error);
    } finally {
      isLoading = false;
    }
  }

  async function handleNsecLogin() {
    if (!nsec.trim()) return;
    isLoading = true;
    
    try {
      const success = await loginWithNsec(nsec);
      if (success) {
        await loadUser();
        onLogin();
        onClose();
      }
    } catch (error) {
      console.error('Nsec login failed:', error);
    } finally {
      isLoading = false;
    }
  }

  async function handleBunkerLogin() {
    if (!bunkerUrl.trim() || !bunkerUrl.startsWith('bunker://')) return;
    isLoading = true;
    
    try {
      const success = await loginWithBunker(bunkerUrl);
      if (success) {
        await loadUser();
        onLogin();
        onClose();
      }
    } catch (error) {
      console.error('Bunker login failed:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      nsec = content.trim();
    };
    reader.readAsText(file);
  }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-0 overflow-hidden">
    <!-- Header -->
    <div class="px-6 pt-6 pb-0 relative">
      <h2 class="text-xl text-gray-300 font-semibold text-center">Log in</h2>
      <p class="text-center text-gray-300 dark:text-gray-400 mt-2">
        Access your account securely with your preferred method
      </p>
    </div>

    <!-- Content -->
    <div class="px-6 py-8 space-y-6">
      <!-- Tabs -->
      <div class="w-full">
        <!-- Tab Navigation -->
        <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          {#if isNip07Available}
          <button 
            class="flex-1 py-2 font-medium text-sm w-32 {activeTab === 'extension' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-gray-500 dark:text-gray-400'}"
            on:click={() => activeTab = 'extension'}
          >
            Extension
          </button>
          {/if}
          <button 
            class="flex-1 py-2 font-medium text-sm w-32 {activeTab === 'nsec' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-gray-500 dark:text-gray-400'}"
            on:click={() => activeTab = 'nsec'}
          >
            Nsec
          </button>
          <button 
            class="flex-1 py-2 font-medium text-sm w-32 {activeTab === 'bunker' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-gray-500 dark:text-gray-400'}"
            on:click={() => activeTab = 'bunker'}
          >
            Bunker
          </button>
        </div>

        <!-- Tab Content -->
        {#if activeTab === 'extension' && isNip07Available}
          <div class="space-y-4">
            <div class="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Login with one click using the browser extension
              </p>
              <button
                class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg dark:bg-blue-500 dark:hover:bg-blue-600"
                on:click={handleExtensionLogin}
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login with Extension'}
              </button>
            </div>
          </div>
        {/if}

        {#if activeTab === 'nsec'}
          <div class="space-y-4">
            <div class="space-y-2 text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <label for="nsec" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter your nsec
              </label>
              <input
                id="nsec"
                type="password"
                bind:value={nsec}
                class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="nsec1..."
              />
              <div class="text-xs text-red-500 dark:text-red-400">
                Warning: This a dangerous login method. Never enter your nsec in an untrusted application.
                Use an alternative login method if possible.
              </div>
            

            <!-- <div class="text-center">
              <p class="text-sm mb-2 text-gray-600 dark:text-gray-400">Or upload a key file</p>
              <label for="file-upload" class="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Nsec File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".txt"
                class="hidden"
                on:change={handleFileUpload}
              />
            </div> -->

            <button
              class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg dark:bg-blue-500 dark:hover:bg-blue-600 mt-4"
              on:click={handleNsecLogin}
              disabled={isLoading || !nsec.trim()}
            >
              {isLoading ? 'Verifying...' : 'Login with Nsec'}
            </button>
          </div>
          </div>
        {/if}

        {#if activeTab === 'bunker'}
          <div class="space-y-4">
            <div class="space-y-2 space-y-2 text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <label for="bunkerUri" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bunker URI
              </label>
              <input
                id="bunkerUri"
                type="text"
                bind:value={bunkerUrl}
                class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="bunker://"
              />
              {#if bunkerUrl && !bunkerUrl.startsWith('bunker://')}
                <p class="text-red-500 text-xs">URI must start with bunker://</p>
              {/if}
            

            <button
              class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg dark:bg-blue-500 dark:hover:bg-blue-600"
              on:click={handleBunkerLogin}
              disabled={isLoading || !bunkerUrl.trim() || !bunkerUrl.startsWith('bunker://')}
            >
              {isLoading ? 'Connecting...' : 'Login with Bunker'}
            </button>
          </div>
        </div>
        {/if}
      </div>

      <!-- Close button -->
      <div class="text-center">
        <button on:click={onClose} class="text-gray-600 dark:text-gray-400 hover:underline font-medium text-sm">
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>
{/if} 