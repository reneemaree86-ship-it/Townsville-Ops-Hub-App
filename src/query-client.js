import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/use-toast';

let sessionExpiredToastShown = false;

function isAuthError(error) {
  const status = error?.status ?? error?.response?.status;
  if (status === 401 || status === 403) return true;
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('unauthor') || msg.includes('not authenticated') || msg.includes('token');
}

function handleGlobalError(error, context) {
  if (!error) return;

  if (isAuthError(error)) {
    if (!sessionExpiredToastShown) {
      sessionExpiredToastShown = true;
      toast({
        title: 'Your session has expired',
        description: 'Please log in again to continue — your data is safe, this page just needs a fresh login.',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
    }
    return;
  }

  // Any other failure (network blip, validation, server error) — surface it instead of failing silently.
  toast({
    title: context === 'mutation' ? 'Action failed' : 'Could not load data',
    description: error?.message || 'Something went wrong. Please try again.',
    variant: 'destructive',
  });
}

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => handleGlobalError(error, 'query'),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleGlobalError(error, 'mutation'),
  }),
});
