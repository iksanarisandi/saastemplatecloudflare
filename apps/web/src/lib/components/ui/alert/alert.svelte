<script lang="ts" context="module">
  import { tv, type VariantProps } from 'tailwind-variants';

  export const alertVariants = tv({
    base: 'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-500',
        warning: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-500'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  });

  export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
  import { cn } from '$lib/utils';

  export let variant: AlertVariant = 'default';
  let className = '';
  export { className as class };
</script>

<div
  role="alert"
  class={cn(alertVariants({ variant }), className)}
  {...$$restProps}
>
  <slot />
</div>
