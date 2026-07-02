import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Broker } from '@/types';
import { api } from '@/lib/api';

export function useBrokers() {
  const queryClient = useQueryClient();

  const { data: brokers = [], isLoading, error, refetch } = useQuery<Broker[]>({
    queryKey: ['brokers'],
    queryFn: async () => {
      const res = await api('/api/brokers');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
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
