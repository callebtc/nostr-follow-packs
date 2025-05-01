<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/user';
  import { logout } from '$lib/stores/login';
  import LoginModal from './LoginModal.svelte';

  let isLoginModalOpen = false;
  let isLoggedIn = false;

  // Subscribe to the user store to know if the user is logged in
  $: isLoggedIn = !!$user;

  function openLoginModal() {
    isLoginModalOpen = true;
  }

  function closeLoginModal() {
    isLoginModalOpen = false;
  }

  function handleLogin() {
    // The modal will handle the login process
    // This is a callback that will be fired when login is complete
  }

  function handleLogout() {
    logout();
    user.set(null);
  }
</script>

<div>
  {#if isLoggedIn}
    <button 
      on:click={handleLogout}
      class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg dark:bg-red-500 dark:hover:bg-red-600"
    >
      Log out
    </button>
  {:else}
    <button 
      on:click={openLoginModal}
      class="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg dark:bg-purple-500 dark:hover:bg-purple-600"
    >
      Log in
    </button>
  {/if}
</div>

<LoginModal 
  isOpen={isLoginModalOpen} 
  onClose={closeLoginModal} 
  onLogin={handleLogin}
/> 