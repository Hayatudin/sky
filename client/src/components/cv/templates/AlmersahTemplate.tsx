import React from 'react';
import { Candidate } from '@/types';
import RawasiAzmLayout from './RawasiAzmLayout';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function AlmersahTemplate(props: CVTemplateProps) {
  return (
    <RawasiAzmLayout
      {...props}
      branding={{
        agencyName: 'ALMERSAH RECRUITMENT AGENCY',
        email: 'info@almersah.com',
        tel: '+966123456789',
      }}
    />
  );
}
