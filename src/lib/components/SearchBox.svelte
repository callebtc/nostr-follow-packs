<script lang="ts">
  import { goto } from '$app/navigation';
  
  // Search state
  let searchQuery = '';
  let focused = false;

  // Handle search form submission
  function handleSearch(e: Event) {
    e.preventDefault();
    
    // Only navigate if we have a query
    if (searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  // Toggle focus state for styling
  function handleFocus() {
    focused = true;
  }

  function handleBlur() {
    focused = false;
  }
</script>

<form 
  on:submit={handleSearch}
  class="hidden md:flex items-center relative max-w-md w-full"
>
  <div class="relative w-full">
    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <!-- Search icon -->
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-5 w-5 text-gray-400" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
    </div>
    <input
      type="search"
      id="search"
      bind:value={searchQuery}
      on:focus={handleFocus}
      on:blur={handleBlur}
      class="pl-10 py-2 px-4 w-full bg-gray-50 border {focused ? 'border-purple-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      placeholder="Search packs or users..."
      autocomplete="off"
    />
  </div>
</form>
