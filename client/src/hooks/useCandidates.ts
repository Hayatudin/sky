import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate } from '@/types';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function clearCandidatesCache() {
  queryClient.invalidateQueries({ queryKey: ['candidates'] });
}

export function useCandidates() {
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading, error, refetch } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: async () => {
      try {
        const res = await api('/api/candidates');
        const json = await res.json();
        // Guard: ensure the result is always an array
        return Array.isArray(json) ? json : (json?.data ?? json?.candidates ?? []);
      } catch (err: any) {
        console.error('[useCandidates] Fetch failed:', err?.message || err);
        throw err;
      }
    },
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
