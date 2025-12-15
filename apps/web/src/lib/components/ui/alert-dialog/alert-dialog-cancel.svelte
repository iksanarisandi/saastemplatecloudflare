<script lang="ts">
  import { getContext } from 'svelte';
  import { Button } from '../button';
  import type { Writable } from 'svelte/store';

  const { close } = getContext<{
    isOpen: Writable<boolean>;
    close: () => void;
  }>('alertDialog');
</script>

<Button variant="outline" on:click={close} {...$$restProps}>
  <slot />
</Button>
