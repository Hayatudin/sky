'use client';

import React from 'react';
import QuickRegistrationForm from '@/components/registration/QuickRegistrationForm';
import { useSession } from '@/lib/auth-client';
import { canAccessCalling } from '@/lib/role-config';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CallingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!session?.user || !canAccessCalling(session.user)) {
    if (typeof window !== 'undefined') {
      router.push('/dashboard');
    }
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Access Denied. You do not have permission to view the Calling page.
      </div>
    );
  }

  return <QuickRegistrationForm forceCalling={true} />;
}
