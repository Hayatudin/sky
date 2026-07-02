import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useInvoices() {
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api('/api/invoices');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const mutate = (updater?: any[] | ((prev: any[]) => any[])) => {
    if (updater === undefined) {
      refetch();
      return;
    }

    if (typeof updater === 'function') {
      queryClient.setQueryData<any[]>(['invoices'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<any[]>(['invoices'], updater);
    }
  };

  return {
    invoices,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
