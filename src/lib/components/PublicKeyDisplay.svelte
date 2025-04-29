<script lang="ts">
  import { hexToNpub } from '$lib/services/vertex-search';
  import { onMount } from 'svelte';

  export let pubkey: string;
  export let showFull: boolean = false;
  
  let npub: string = '';
  let copying: boolean = false;
  let abbreviated: string = '';
  
  onMount(async () => {
    try {
      const result = await hexToNpub(pubkey);
      npub = result || pubkey;
      abbreviated = showFull ? npub : `${npub.substring(0, 8)}...${npub.substring(npub.length - 4)}`;
    } catch (err) {
      console.error('Error converting to npub:', err);
      // Fallback to hex abbreviation if npub conversion fails
      abbreviated = `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 8)}`;
    }
  });

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(npub || pubkey);
      copying = true;
      setTimeout(() => { copying = false; }, 1500);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  }
</script>

<button 
  type="button"
  on:click={copyToClipboard}
  class="text-xs text-gray-500 hover:text-gray-700 transition"
>
  {#if copying}
    <span class="text-green-600">Copied!</span>
  {:else}
    {abbreviated || `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 8)}`}
  {/if}
</button> 