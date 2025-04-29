<script lang="ts">
  import { nip19 } from 'nostr-tools';
  import { DEFAULT_RELAYS } from '$lib/nostr/ndk';
  
  export let eventId: string;
  export let pubkey: string;
  export let kind: number = 30001; // Default kind for follow list
  
  let copied = false;
  
  function copyEvent() {
    // Generate nevent with nostr-tools
    const nevent = nip19.neventEncode({
      id: eventId,
      relays: DEFAULT_RELAYS,
      author: pubkey,
      kind: kind
    });
    
    const nostrLink = `nostr:${nevent}`;
    
    // Copy to clipboard using execCommand as fallback
    try {
      // Modern method
      navigator.clipboard.writeText(nostrLink);
      
      // Show copied state
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.textContent = nostrLink;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        copied = true;
        setTimeout(() => {
          copied = false;
        }, 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }
</script>

<button 
  on:click={copyEvent} 
  class="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors ml-2 w-[100px]"
  title="Copy Nostr event link"
>
  {#if copied}
    <span>Copied!</span>
  {:else}
    <span>Copy Event</span>
  {/if}
</button> 