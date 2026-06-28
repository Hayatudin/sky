import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate } from '@/types';
import { api } from '@/lib/api';

export function clearCandidatesCache() {
  // Deprecated/No-op when using TanStack Query, kept to prevent compilation errors if called
}

export function useCandidates() {
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading, error, refetch } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: () => api('/api/candidates').then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    }),
  });

  const mutate = (updater?: Candidate[] | ((prev: Candidate[]) => Candidate[])) => {
    if (updater === undefined) {
      refetch();
      return;
    }

    if (typeof updater === 'function') {
      queryClient.setQueryData<Candidate[]>(['candidates'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<Candidate[]>(['candidates'], updater);
    }
  };

  return {
    candidates,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
