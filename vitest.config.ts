import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        // Modules purs des Edge Functions (zéro import Deno), dont le barème que
        // l'app embarque. Les tests de l'app tournent dans apps/mobile.
        include: ['supabase/functions/**/*.test.ts'],
    },
});
