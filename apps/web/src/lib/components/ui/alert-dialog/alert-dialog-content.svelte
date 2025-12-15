<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils';
  import { fade, scale } from 'svelte/transition';
  import type { Writable } from 'svelte/store';

  let className = '';
  export { className as class };

  const { isOpen } = getContext<{
    isOpen: Writable<boolean>;
  }>('alertDialog');
</script>

{#if $isOpen}
  <!-- Backdrop - no click to close for alert dialogs -->
  <div
    class="fixed inset-0 z-50 bg-black/80"
    transition:fade={{ duration: 150 }}
  />

  <!-- Content -->
  <div
    class={cn(
      'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
      className
    )}
    role="alertdialog"
    aria-modal="true"
    transition:scale={{ duration: 150, start: 0.95 }}
    {...$$restProps}
  >
    <slot />
  </div>
{/if}
