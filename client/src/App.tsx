import { AppRouting } from '@/routing/app-routing';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const { BASE_URL } = import.meta.env;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          storageKey="vite-theme"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <HelmetProvider>
            <LoadingBarContainer>
              <BrowserRouter basename={BASE_URL}>
                <Toaster />
                <AppRouting />
              </BrowserRouter>
            </LoadingBarContainer>
          </HelmetProvider>
        </ThemeProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
