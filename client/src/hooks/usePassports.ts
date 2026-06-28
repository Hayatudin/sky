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
    queryFn: () => api('/api/passports').then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch passports');
      return res.json();
    }),
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
