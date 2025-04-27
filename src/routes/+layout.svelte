<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { user, loadUser, checkNip07Extension } from '$lib/stores/user';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let hasExtension = false;

  onMount(async () => {
    hasExtension = await checkNip07Extension();
    if (hasExtension) {
      await loadUser();
    }
  });

  function handleLogin() {
    if (!hasExtension) {
      alert('Please install a NIP-07 compatible browser extension like Alby or nos2x');
      return;
    }
    loadUser();
  }
</script>

<svelte:head>
  <title>Nostr Follow List</title>
  <meta name="description" content="Create, share, and discover Nostr follow lists" />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <header class="bg-white shadow-sm">
    <div class="container py-4 flex justify-between items-center">
      <a href="/" class="text-2xl font-bold text-purple-600">Nostr Follow List</a>
      <div>
        {#if $user}
          <div class="flex items-center space-x-2">
            <img 
              src={$user.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
              alt={$user.name || 'User'} 
              class="w-8 h-8 rounded-full"
            />
            <span class="font-medium">{$user.name || 'Anonymous'}</span>
          </div>
        {:else}
          <button on:click={handleLogin} class="btn btn-primary">
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
      <p>Nostr Follow List – Discover and share your favorite Nostr users</p>
    </div>
  </footer>
</div> 