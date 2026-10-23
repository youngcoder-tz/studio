'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          theme="system"
          richColors
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-panel-2)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-line)',
              backdropFilter: 'blur(18px) saturate(120%)',
              boxShadow: 'var(--shadow-panel)',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
