<script lang="ts">
  import { cn } from '$lib/utils';

  let className = '';
  export { className as class };
</script>

<tbody class={cn('[&_tr:last-child]:border-0', className)} {...$$restProps}>
  <slot />
</tbody>
