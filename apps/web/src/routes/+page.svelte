<script lang="ts">
  // Home page
</script>

<svelte:head>
  <title>SaaS Application</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center p-4">
  <div class="text-center">
    <h1 class="text-4xl font-bold tracking-tight">
      Cloudflare SaaS Boilerplate
    </h1>
    <p class="mt-4 text-lg text-muted-foreground">
      A modern SaaS starter built with SvelteKit, Hono.js, and Cloudflare
    </p>
    <div class="mt-8 flex gap-4 justify-center">
      <a
        href="/login"
        class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      >
        Get Started
      </a>
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        GitHub
      </a>
    </div>
  </div>
</main>
