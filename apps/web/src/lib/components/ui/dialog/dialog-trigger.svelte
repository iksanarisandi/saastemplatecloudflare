<script lang="ts">
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  const { toggle } = getContext<{
    isOpen: Writable<boolean>;
    toggle: () => void;
  }>('dialog');
</script>

<span on:click={toggle} on:keydown={(e) => e.key === 'Enter' && toggle()} role="button" tabindex="0">
  <slot />
</span>
