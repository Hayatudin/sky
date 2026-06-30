import React from 'react';
import { Candidate } from '@/types';
import RawasiAzmLayout from './RawasiAzmLayout';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function AzmTemplate(props: CVTemplateProps) {
  return (
    <RawasiAzmLayout
      {...props}
      branding={{
        agencyName: 'SKY FOREIGN EMPLOYMENT AGENCY',
        email: 'shakushakisa12@gmail.com',
        tel: '+251929676688',
      }}
    />
  );
}
