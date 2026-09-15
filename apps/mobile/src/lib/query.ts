import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Mobile network: retry a bit more aggressively than the default
            retry: 2,
            staleTime: 30_000,
        },
    },
});
