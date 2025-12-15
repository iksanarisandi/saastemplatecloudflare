<script lang="ts" generics="T">
  import { cn } from '$lib/utils';
  import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table';

  type Column<T> = {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    render?: (item: T) => string;
  };

  export let data: T[] = [];
  export let columns: Column<T>[] = [];
  export let sortKey: string | null = null;
  export let sortDirection: 'asc' | 'desc' = 'asc';
  export let onSort: ((key: string, direction: 'asc' | 'desc') => void) | undefined = undefined;
  let className = '';
  export { className as class };

  function handleSort(key: string) {
    if (!onSort) return;
    
    if (sortKey === key) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, newDirection);
    } else {
      onSort(key, 'asc');
    }
  }

  function getValue(item: T, column: Column<T>): string {
    if (column.render) {
      return column.render(item);
    }
    const value = item[column.key as keyof T];
    return value != null ? String(value) : '';
  }
</script>

<div class={cn('rounded-md border', className)}>
  <Table>
    <TableHeader>
      <TableRow>
        {#each columns as column}
          <TableHead>
            {#if column.sortable && onSort}
              <button
                type="button"
                class="flex items-center gap-1 hover:text-foreground"
                on:click={() => handleSort(String(column.key))}
              >
                {column.header}
                {#if sortKey === column.key}
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
                    class={cn('h-4 w-4', sortDirection === 'desc' && 'rotate-180')}
                  >
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                {:else}
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
                    class="h-4 w-4 opacity-30"
                  >
                    <path d="m7 15 5 5 5-5" />
                    <path d="m7 9 5-5 5 5" />
                  </svg>
                {/if}
              </button>
            {:else}
              {column.header}
            {/if}
          </TableHead>
        {/each}
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if data.length === 0}
        <TableRow>
          <TableCell class="h-24 text-center text-muted-foreground" colspan={columns.length}>
            No results.
          </TableCell>
        </TableRow>
      {:else}
        {#each data as item}
          <TableRow>
            {#each columns as column}
              <TableCell>{getValue(item, column)}</TableCell>
            {/each}
          </TableRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>
