<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils';
  import type { Writable } from 'svelte/store';

  let className = '';
  export { className as class };

  const context = getContext<{
    error: Writable<string | undefined>;
    name: Writable<string>;
  } | undefined>('formField');

  const error = context?.error;
</script>

<label
  class={cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    $error && 'text-destructive',
    className
  )}
  {...$$restProps}
>
  <slot />
</label>
