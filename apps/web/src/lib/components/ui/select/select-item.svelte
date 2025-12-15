<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils';
  import type { Writable } from 'svelte/store';

  export let value: string;
  export let disabled = false;
  let className = '';
  export { className as class };

  const { selectedValue, select } = getContext<{
    selectedValue: Writable<string>;
    select: (value: string) => void;
  }>('select');

  $: isSelected = $selectedValue === value;
</script>

<button
  type="button"
  role="option"
  aria-selected={isSelected}
  {disabled}
  class={cn(
    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
    disabled && 'pointer-events-none opacity-50',
    isSelected && 'bg-accent text-accent-foreground',
    className
  )}
  on:click={() => !disabled && select(value)}
  {...$$restProps}
>
  {#if isSelected}
    <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
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
        class="h-4 w-4"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  {/if}
  <slot />
</button>
