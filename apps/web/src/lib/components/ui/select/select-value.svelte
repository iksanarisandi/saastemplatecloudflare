<script lang="ts">
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  export let placeholder = 'Select an option';

  const { selectedValue } = getContext<{
    selectedValue: Writable<string>;
  }>('select');
</script>

<span class={$selectedValue ? '' : 'text-muted-foreground'}>
  {#if $selectedValue}
    <slot>{$selectedValue}</slot>
  {:else}
    {placeholder}
  {/if}
</span>
