/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1';
import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDb() {
    let d1Instance: D1Database | undefined;

    // 1. Try Production Request Context
    try {
        const ctx = getRequestContext();
        const env = ctx?.env as any; // <--- This 'as any' silences the TypeScript error
        if (env?.DB) d1Instance = env.DB;
    } catch (err) {
        // 2. Try Node Process Env (Standard Local Dev)
        if (!d1Instance && typeof process !== 'undefined' && (process.env as any).DB) {
            d1Instance = (process.env as any).DB;
        }

        // 3. Try Miniflare Global Env (Fallback)
        if (!d1Instance && typeof globalThis !== 'undefined') {
            const globalEnv = (globalThis as any).__env__ || (globalThis as any).MINIFLARE_BINDINGS;
            if (globalEnv?.DB) d1Instance = globalEnv.DB;
        }

        if (!d1Instance) {
            throw new Error('D1 Binding "DB" not detected. Ensure Turbopack is disabled and wrangler.toml exists.');
        }

        return drizzle(d1Instance);
    }
}