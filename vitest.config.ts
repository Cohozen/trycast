import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    test: {
        environment: 'node',
        // supabase/functions : uniquement les modules purs (zéro import Deno)
        include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    },
});
