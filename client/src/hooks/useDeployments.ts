import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDeployments() {
  const queryClient = useQueryClient();

  const { data: deployments = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['deployments'],
    queryFn: async () => {
      const res = await api('/api/deployments');
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
      queryClient.setQueryData<any[]>(['deployments'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<any[]>(['deployments'], updater);
    }
  };

  return {
    deployments,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
