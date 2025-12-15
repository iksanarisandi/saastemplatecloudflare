<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils';
  import type { Writable } from 'svelte/store';

  let className = '';
  export { className as class };

  const { isOpen, isDisabled, toggle } = getContext<{
    isOpen: Writable<boolean>;
    isDisabled: Writable<boolean>;
    toggle: () => void;
  }>('select');
</script>

<button
  type="button"
  role="combobox"
  aria-expanded={$isOpen}
  aria-controls="select-listbox"
  disabled={$isDisabled}
  class={cn(
    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
  on:click={toggle}
  {...$$restProps}
>
  <slot />
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="ml-2 h-4 w-4 opacity-50"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
</button>
