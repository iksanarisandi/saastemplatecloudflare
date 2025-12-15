<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils';
  import type { Writable } from 'svelte/store';

  export let value: string;
  export let id: string | undefined = undefined;
  export let disabled = false;
  let className = '';
  export { className as class };

  const { selectedValue, groupName, isDisabled, select } = getContext<{
    selectedValue: Writable<string>;
    groupName: Writable<string | undefined>;
    isDisabled: Writable<boolean>;
    select: (value: string) => void;
  }>('radioGroup');

  $: isSelected = $selectedValue === value;
  $: isItemDisabled = disabled || $isDisabled;
</script>

<div class="flex items-center space-x-2">
  <button
    type="button"
    role="radio"
    aria-checked={isSelected}
    {id}
    disabled={isItemDisabled}
    class={cn(
      'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    on:click={() => !isItemDisabled && select(value)}
    {...$$restProps}
  >
    {#if isSelected}
      <span class="flex items-center justify-center">
        <span class="h-2.5 w-2.5 rounded-full bg-current" />
      </span>
    {/if}
  </button>
  <slot />
</div>

<!-- Hidden input for form submission -->
{#if $groupName && isSelected}
  <input type="hidden" name={$groupName} {value} />
{/if}
