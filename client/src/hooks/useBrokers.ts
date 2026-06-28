import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Broker } from '@/types';
import { api } from '@/lib/api';

export function useBrokers() {
  const queryClient = useQueryClient();

  const { data: brokers = [], isLoading, error, refetch } = useQuery<Broker[]>({
    queryKey: ['brokers'],
    queryFn: () => api('/api/brokers').then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch brokers');
      return res.json();
    }),
  });

  const mutate = (updater?: Broker[] | ((prev: Broker[]) => Broker[])) => {
    if (updater === undefined) {
      refetch();
      return;
    }

    if (typeof updater === 'function') {
      queryClient.setQueryData<Broker[]>(['brokers'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<Broker[]>(['brokers'], updater);
    }
  };

  return {
    brokers,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
