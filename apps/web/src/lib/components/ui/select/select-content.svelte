<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { cn } from '$lib/utils';
  import type { Writable } from 'svelte/store';

  let className = '';
  export { className as class };

  const { isOpen, close } = getContext<{
    isOpen: Writable<boolean>;
    close: () => void;
  }>('select');

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('[role="combobox"]') && !target.closest('[role="listbox"]')) {
      close();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
</script>

{#if $isOpen}
  <div
    id="select-listbox"
    role="listbox"
    class={cn(
      'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
      className
    )}
    {...$$restProps}
  >
    <slot />
  </div>
{/if}
