<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  export let open = false;

  const isOpen = writable(open);

  $: isOpen.set(open);
  $: open = $isOpen;

  setContext('dialog', {
    isOpen,
    open: () => isOpen.set(true),
    close: () => isOpen.set(false),
    toggle: () => isOpen.update((v) => !v)
  });
</script>

<slot />
