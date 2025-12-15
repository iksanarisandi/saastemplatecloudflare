<script lang="ts">
  import { cn } from '$lib/utils';

  let className = '';
  export { className as class };
</script>

<div
  class={cn('animate-pulse rounded-md bg-muted', className)}
  {...$$restProps}
/>
