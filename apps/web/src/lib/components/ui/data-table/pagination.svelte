<script lang="ts">
  import { cn } from '$lib/utils';
  import { Button } from '../button';

  export let page = 1;
  export let totalPages = 1;
  export let totalItems = 0;
  export let pageSize = 10;
  export let onPageChange: ((page: number) => void) | undefined = undefined;
  let className = '';
  export { className as class };

  $: startItem = (page - 1) * pageSize + 1;
  $: endItem = Math.min(page * pageSize, totalItems);

  function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages && onPageChange) {
      onPageChange(newPage);
    }
  }
</script>

<div class={cn('flex items-center justify-between px-2 py-4', className)}>
  <div class="text-sm text-muted-foreground">
    {#if totalItems > 0}
      Showing {startItem} to {endItem} of {totalItems} results
    {:else}
      No results
    {/if}
  </div>
  
  <div class="flex items-center space-x-2">
    <Button
      variant="outline"
      size="sm"
      disabled={page <= 1}
      on:click={() => goToPage(1)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
      >
        <path d="m11 17-5-5 5-5" />
        <path d="m18 17-5-5 5-5" />
      </svg>
    </Button>
    <Button
      variant="outline"
      size="sm"
      disabled={page <= 1}
      on:click={() => goToPage(page - 1)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </Button>
    
    <span class="text-sm">
      Page {page} of {totalPages}
    </span>
    
    <Button
      variant="outline"
      size="sm"
      disabled={page >= totalPages}
      on:click={() => goToPage(page + 1)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Button>
    <Button
      variant="outline"
      size="sm"
      disabled={page >= totalPages}
      on:click={() => goToPage(totalPages)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
      >
        <path d="m6 17 5-5-5-5" />
        <path d="m13 17 5-5-5-5" />
      </svg>
    </Button>
  </div>
</div>
