<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  export let value: string = '';
  export let onValueChange: ((value: string) => void) | undefined = undefined;
  export let open = false;
  export let disabled = false;

  const selectedValue = writable(value);
  const isOpen = writable(open);
  const isDisabled = writable(disabled);

  $: selectedValue.set(value);
  $: isOpen.set(open);
  $: isDisabled.set(disabled);

  $: if (onValueChange && $selectedValue !== value) {
    onValueChange($selectedValue);
  }

  setContext('select', {
    selectedValue,
    isOpen,
    isDisabled,
    select: (val: string) => {
      selectedValue.set(val);
      isOpen.set(false);
      if (onValueChange) onValueChange(val);
    },
    toggle: () => {
      if (!$isDisabled) isOpen.update(v => !v);
    },
    close: () => isOpen.set(false)
  });
</script>

<div class="relative inline-block w-full" {...$$restProps}>
  <slot />
</div>
