import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useInvoices() {
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['invoices'],
    queryFn: () => api('/api/invoices').then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    }),
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
