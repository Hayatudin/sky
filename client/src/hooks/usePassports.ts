import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Passport {
  id: string;
  shelfNo: string;
  fullName: string;
  passportNumber: string;
  passportImageUrl: string | null;
  status: string;
  takenReason?: string | null;
  takenByName?: string | null;
  takenByPhone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function usePassports() {
  const queryClient = useQueryClient();

  const { data: passports = [], isLoading, error, refetch } = useQuery<Passport[]>({
    queryKey: ['passports'],
    queryFn: async () => {
      const res = await api('/api/passports');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const mutate = (updater?: Passport[] | ((prev: Passport[]) => Passport[])) => {
    if (updater === undefined) {
      refetch();
      return;
    }

    if (typeof updater === 'function') {
      queryClient.setQueryData<Passport[]>(['passports'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<Passport[]>(['passports'], updater);
    }
  };

  return {
    passports,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
