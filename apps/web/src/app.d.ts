// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId: string;
      };
    }
    // interface PageData {}
    interface Platform {
      env: {
        DB: D1Database;
        KV: KVNamespace;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
