<script lang="ts">
  import { getContext } from 'svelte';
  import { Button } from '../button';
  import type { Writable } from 'svelte/store';

  const { close } = getContext<{
    isOpen: Writable<boolean>;
    close: () => void;
  }>('alertDialog');

  function handleClick() {
    close();
  }
</script>

<Button on:click={handleClick} {...$$restProps}>
  <slot />
</Button>
