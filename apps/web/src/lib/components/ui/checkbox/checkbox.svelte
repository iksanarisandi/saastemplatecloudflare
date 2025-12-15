<script lang="ts">
  import { cn } from '$lib/utils';

  export let checked = false;
  export let disabled = false;
  export let id: string | undefined = undefined;
  export let name: string | undefined = undefined;
  let className = '';
  export { className as class };
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={checked}
  {id}
  {disabled}
  class={cn(
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    checked && 'bg-primary text-primary-foreground',
    className
  )}
  on:click={() => !disabled && (checked = !checked)}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) checked = !checked;
    }
  }}
  {...$$restProps}
>
  {#if checked}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  {/if}
</button>

<!-- Hidden input for form submission -->
{#if name}
  <input type="hidden" {name} value={checked ? 'on' : ''} />
{/if}
