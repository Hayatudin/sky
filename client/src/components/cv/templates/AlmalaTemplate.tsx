import React from 'react';
import { Candidate } from '@/types';
import RawasiAzmLayout from './RawasiAzmLayout';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function AlmalaTemplate(props: CVTemplateProps) {
  return (
    <RawasiAzmLayout
      {...props}
      branding={{
        agencyName: 'ALMALA RECRUITMENT AGENCY',
        email: 'info@almala.com',
        tel: '+966123456789',
        headerImage: '/almala-header.png',
      }}
    />
  );
}
