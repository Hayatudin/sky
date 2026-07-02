import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Leader } from '@/types';
import { api } from '@/lib/api';

export function useLeaders() {
  const queryClient = useQueryClient();

  const { data: leaders = [], isLoading, error, refetch } = useQuery<Leader[]>({
    queryKey: ['leaders'],
    queryFn: async () => {
      const res = await api('/api/leaders');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const mutate = (updater?: Leader[] | ((prev: Leader[]) => Leader[])) => {
    if (updater === undefined) {
      refetch();
      return;
    }

    if (typeof updater === 'function') {
      queryClient.setQueryData<Leader[]>(['leaders'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<Leader[]>(['leaders'], updater);
    }
  };

  return {
    leaders,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
