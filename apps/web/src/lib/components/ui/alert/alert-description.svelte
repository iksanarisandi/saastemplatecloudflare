<script lang="ts">
  import { cn } from '$lib/utils';

  let className = '';
  export { className as class };
</script>

<div
  class={cn('text-sm [&_p]:leading-relaxed', className)}
  {...$$restProps}
>
  <slot />
</div>
