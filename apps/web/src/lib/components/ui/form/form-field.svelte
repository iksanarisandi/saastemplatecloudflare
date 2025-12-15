<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { cn } from '$lib/utils';

  export let name: string;
  export let error: string | undefined = undefined;
  let className = '';
  export { className as class };

  const fieldError = writable<string | undefined>(error);
  const fieldName = writable<string>(name);

  $: fieldError.set(error);
  $: fieldName.set(name);

  setContext('formField', {
    error: fieldError,
    name: fieldName
  });
</script>

<div class={cn('space-y-2', className)} {...$$restProps}>
  <slot />
</div>
