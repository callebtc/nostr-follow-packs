<script lang="ts">
  export let src: string | null | undefined = undefined;
  export let alt: string = 'User';
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let onClick: (() => void) | null = null;
  export let classes: string = '';
  export let style: string = '';

  const defaultSrc = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  
  // Define size classes
  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };
  
  const sizeClass = sizeClasses[size];
  
  function handleError(e: Event) {
    const target = e.target as HTMLImageElement;
    target.src = defaultSrc;
  }
</script>

{#if onClick}
  <button on:click={onClick}>
    <img 
      src={src || defaultSrc} 
      {alt}
      class="{sizeClass} rounded-full object-cover {classes}"
      {style}
      on:error={handleError}
    />
  </button>
{:else}
  <img 
    src={src || defaultSrc} 
    {alt}
    class="{sizeClass} rounded-full object-cover {classes}"
    {style}
    on:error={handleError}
  />
{/if} 