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

{#if $error}
  <p
    class={cn('text-sm font-medium text-destructive', className)}
    {...$$restProps}
  >
    {$error}
  </p>
{/if}
