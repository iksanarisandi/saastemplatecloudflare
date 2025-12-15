<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { cn } from '$lib/utils';

  export let value: string = '';
  export let name: string | undefined = undefined;
  export let disabled = false;
  export let onValueChange: ((value: string) => void) | undefined = undefined;
  let className = '';
  export { className as class };

  const selectedValue = writable(value);
  const groupName = writable<string | undefined>(name);
  const isDisabled = writable(disabled);

  $: selectedValue.set(value);
  $: groupName.set(name);
  $: isDisabled.set(disabled);

  $: if (onValueChange && $selectedValue !== value) {
    onValueChange($selectedValue);
  }

  setContext('radioGroup', {
    selectedValue,
    groupName,
    isDisabled,
    select: (val: string) => {
      selectedValue.set(val);
      if (onValueChange) onValueChange(val);
    }
  });
</script>

<div
  role="radiogroup"
  class={cn('grid gap-2', className)}
  {...$$restProps}
>
  <slot />
</div>
