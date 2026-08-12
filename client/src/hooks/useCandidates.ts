import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate } from '@/types';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function clearCandidatesCache() {
  queryClient.invalidateQueries({ queryKey: ['candidates'] });
}

export function useCandidates(includeArrived: boolean = false, includeCalling: boolean = true) {
  const queryClient = useQueryClient();

  const queryKey = ['candidates', { includeArrived, includeCalling }];

  const { data: candidates = [], isLoading, error, refetch } = useQuery<Candidate[]>({
    queryKey,
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (includeArrived) params.append('includeArrived', 'true');
        if (!includeCalling) params.append('includeCalling', 'false');
        const queryString = params.toString();
        const url = `/api/candidates${queryString ? `?${queryString}` : ''}`;
        const res = await api(url);
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
      queryClient.setQueryData<Candidate[]>(queryKey, (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<Candidate[]>(queryKey, updater);
    }
  };

  return {
    candidates,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
