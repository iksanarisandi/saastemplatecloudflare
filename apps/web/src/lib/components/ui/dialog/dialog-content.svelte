<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { cn } from '$lib/utils';
  import { fade, scale } from 'svelte/transition';
  import type { Writable } from 'svelte/store';

  let className = '';
  export { className as class };

  const { isOpen, close } = getContext<{
    isOpen: Writable<boolean>;
    close: () => void;
  }>('dialog');

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if $isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/80"
    transition:fade={{ duration: 150 }}
    on:click={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="button"
    tabindex="-1"
    aria-label="Close dialog"
  />

  <!-- Content -->
  <div
    class={cn(
      'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
      className
    )}
    role="dialog"
    aria-modal="true"
    transition:scale={{ duration: 150, start: 0.95 }}
    {...$$restProps}
  >
    <slot />
    <button
      type="button"
      class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      on:click={close}
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
{/if}
