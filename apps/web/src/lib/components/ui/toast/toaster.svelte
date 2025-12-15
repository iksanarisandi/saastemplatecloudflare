<script lang="ts">
  import { toasts, type ToastType } from './toast-store';
  import { cn } from '$lib/utils';
  import { fly } from 'svelte/transition';

  const typeStyles: Record<ToastType, string> = {
    success: 'border-green-500 bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100',
    error: 'border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100',
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100'
  };

  const typeIcons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
</script>

<div
  class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
  aria-live="polite"
>
  {#each $toasts as toast (toast.id)}
    <div
      class={cn(
        'pointer-events-auto rounded-lg border p-4 shadow-lg transition-all',
        typeStyles[toast.type]
      )}
      role="alert"
      transition:fly={{ x: 100, duration: 200 }}
    >
      <div class="flex items-start gap-3">
        <span class="text-lg font-bold">{typeIcons[toast.type]}</span>
        <div class="flex-1">
          <p class="font-semibold">{toast.title}</p>
          {#if toast.description}
            <p class="mt-1 text-sm opacity-90">{toast.description}</p>
          {/if}
        </div>
        <button
          type="button"
          class="text-current opacity-50 hover:opacity-100 transition-opacity"
          on:click={() => toasts.dismiss(toast.id)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  {/each}
</div>
