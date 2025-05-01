<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    loginWithExtension, 
    loginWithNsec, 
    loginWithBunker,
    checkNip07Extension,
    generateNostrConnectUrl,
    listenForNostrConnectResponse,
    cancelNostrConnectAttempt,
    connectStatus
  } from '$lib/stores/login';
  import { loadUser } from '$lib/stores/user';
  import QRCode from 'qrcode';

  export let isOpen = false;
  export let onClose = () => {};
  export let onLogin = () => {};

  let activeTab = 'extension';
  let nsec = '';
  let bunkerUrl = '';
  let isLoading = false;
  let isNip07Available = false;
  let showManualBunkerInput = false;
  
  // NostrConnect state
  let nostrConnectUrl = '';
  let qrCodeDataUrl = '';
  let clientPubkey = '';
  let secret = '';
  let copySuccess = false;
  
  // Subscribe to connection status changes
  $: connectionStatus = $connectStatus.status;
  $: connectionMessage = $connectStatus.message || '';

  // Check if NIP-07 extension is available
  onMount(async () => {
    isNip07Available = await checkNip07Extension();
    // If NIP-07 is not available, default to NSEC tab
    if (!isNip07Available) {
      activeTab = 'nsec';
    }
  });

  // Generate QR code when the URL changes
  $: {
    if (nostrConnectUrl) {
      generateQrCode(nostrConnectUrl);
    }
  }

  async function generateQrCode(url: string) {
    try {
      qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#000',
          light: '#fff'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  async function startNostrConnect() {
    try {
      isLoading = true;
      // Generate the nostrconnect URL
      const connectData = await generateNostrConnectUrl();
      nostrConnectUrl = connectData.url;
      clientPubkey = connectData.clientPubkey;
      secret = connectData.secret;
      
      // Start listening for the response
      listenForNostrConnectResponse(clientPubkey, secret)
        .then(async (bunkerUrl) => {
          // Login with the bunker URL
          const success = await loginWithBunker(bunkerUrl);
          if (success) {
            await loadUser();
            onLogin();
            onClose();
          }
        })
        .catch((error) => {
          console.error('NostrConnect error:', error);
          isLoading = false;
        });
    } catch (error) {
      console.error('Error starting NostrConnect:', error);
      isLoading = false;
    }
  }

  function cancelNostrConnect() {
    cancelNostrConnectAttempt();
    nostrConnectUrl = '';
    qrCodeDataUrl = '';
    clientPubkey = '';
    secret = '';
    isLoading = false;
  }

  function copyToClipboard() {
    if (navigator.clipboard && nostrConnectUrl) {
      navigator.clipboard.writeText(nostrConnectUrl).then(
        () => {
          copySuccess = true;
          setTimeout(() => {
            copySuccess = false;
          }, 2000);
        },
        (err) => {
          console.error('Could not copy text: ', err);
        }
      );
    }
  }

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
  
  function toggleManualBunkerInput() {
    showManualBunkerInput = !showManualBunkerInput;
  }
  
  // Clean up when the modal is closed
  $: if (!isOpen) {
    cancelNostrConnect();
  }
</script>

{#if isOpen}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-0 overflow-hidden">
    <!-- Header -->
    <div class="px-6 pt-6 pb-0 relative">
      <h2 class="text-xl text-gray-800 dark:text-gray-300 font-semibold text-center">Log in</h2>
      <p class="text-center text-gray-600 dark:text-gray-400 mt-2">
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
            class="flex-1 py-2 font-medium text-sm {activeTab === 'extension' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-gray-500 dark:text-gray-400'}"
            on:click={() => activeTab = 'extension'}
          >
            Extension
          </button>
          {/if}
          <button 
            class="flex-1 py-2 font-medium text-sm {activeTab === 'nsec' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-gray-500 dark:text-gray-400'}"
            on:click={() => activeTab = 'nsec'}
          >
            Nsec
          </button>
          <button 
            class="flex-1 py-2 font-medium text-sm {activeTab === 'bunker' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-gray-500 dark:text-gray-400'}"
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
            {#if !nostrConnectUrl}
              {#if !showManualBunkerInput}
                <div class="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Connect securely with your Nostr bunker app
                  </p>
                  
                  <!-- <button
                    class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg dark:bg-blue-500 dark:hover:bg-blue-600 mb-3"
                    on:click={startNostrConnect}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Generating...' : 'Connect with QR Code'}
                  </button>
                  
                  <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">or</p> -->
                  
                  <button
                    class="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    on:click={toggleManualBunkerInput}
                  >
                    Enter Bunker URL Manually
                  </button>
                </div>
              {:else}
                <div class="space-y-2 text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
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

                  <div class="flex space-x-2 mt-3">
                    <button
                      class="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg dark:bg-blue-500 dark:hover:bg-blue-600"
                      on:click={handleBunkerLogin}
                      disabled={isLoading || !bunkerUrl.trim() || !bunkerUrl.startsWith('bunker://')}
                    >
                      {isLoading ? 'Connecting...' : 'Connect with Bunker URL'}
                    </button>
                    
                    <button
                      class="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg dark:bg-red-500 dark:hover:bg-red-600 flex items-center"
                      on:click={toggleManualBunkerInput}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              {/if}
            {:else}
              <div class="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 space-y-4">
                <h3 class="font-medium text-gray-800 dark:text-gray-200">
                  {#if connectionStatus === 'waiting'}
                    Scan this QR code with your bunker app
                  {:else if connectionStatus === 'connected'}
                    Connected!
                  {:else if connectionStatus === 'error'}
                    Connection error
                  {/if}
                </h3>
                
                {#if connectionStatus === 'waiting'}
                  {#if qrCodeDataUrl}
                    <div class="flex justify-center">
                      <img src={qrCodeDataUrl} alt="Nostr Connect QR Code" class="rounded-lg border border-gray-300 dark:border-gray-600"/>
                    </div>
                    
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {connectionMessage}
                    </div>
                    
                    <div class="flex space-x-2 justify-center">
                      <button
                        class="py-1 px-3 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        on:click={copyToClipboard}
                      >
                        {#if copySuccess}
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                          Copied!
                        {:else}
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                          Copy URL
                        {/if}
                      </button>
                      
                      <button
                        class="py-1 px-3 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-md dark:bg-red-500 dark:hover:bg-red-600 flex items-center"
                        on:click={cancelNostrConnect}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                        Cancel
                      </button>
                    </div>
                  {/if}
                {:else if connectionStatus === 'error'}
                  <div class="text-red-500 dark:text-red-400 mb-3">
                    {connectionMessage}
                  </div>
                  <button
                    class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg dark:bg-blue-500 dark:hover:bg-blue-600"
                    on:click={cancelNostrConnect}
                  >
                    Try Again
                  </button>
                {/if}
              </div>
            {/if}
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