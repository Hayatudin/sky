import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface QuickReg {
  id: string;
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: string | null;
  religion: string | null;
  registeredBy?: string | null;
  gender: string | null;
  jobExperience: string | null;
  verificationStatus: string;
  promotedCandidateId: string | null;
  createdAt: string;
  cocDocumentUrl?: string | null;
  labourIdUrl?: string | null;
  candidateIdImageUrl?: string | null;
  relativeIdImageUrl?: string | null;
  videoUrl?: string | null;
  relativePhones?: string[] | null;
  educationLevel?: string | null;
  maritalStatus?: string | null;
  numberOfChildren?: number | null;
  passportImageUrl?: string | null;
  dateOfBirth?: string | null;
  dateOfExpiry?: string | null;
  issuingCountry?: string | null;
  placeOfBirth?: string | null;
  brokerId?: string | null;
  broker?: { id: string; name: string } | null;
  agency?: string | null;
  passportType?: string | null;
  languages?: string[] | null;
}

export function useQuickRegistrations() {
  const queryClient = useQueryClient();

  const { data: registrations = [], isLoading, error, refetch } = useQuery<QuickReg[]>({
    queryKey: ['quick-registrations'],
    queryFn: async () => {
      const res = await api('/api/quick-registrations');
      const json = await res.json();
      return Array.isArray(json) ? json : (json?.data ?? []);
    },
  });

  const mutate = (updater?: QuickReg[] | ((prev: QuickReg[]) => QuickReg[])) => {
    if (updater === undefined) {
      refetch();
      return;
    }

    if (typeof updater === 'function') {
      queryClient.setQueryData<QuickReg[]>(['quick-registrations'], (prev = []) => updater(prev));
    } else {
      queryClient.setQueryData<QuickReg[]>(['quick-registrations'], updater);
    }
  };

  return {
    registrations,
    isLoading,
    error: error ? error.message : null,
    mutate,
  };
}
