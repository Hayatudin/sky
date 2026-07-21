import React from 'react';
import { Candidate } from '@/types';
import RawasiAzmLayout from './RawasiAzmLayout';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function RawasiTemplate(props: CVTemplateProps) {
  return (
    <RawasiAzmLayout
      {...props}
      branding={{
        agencyName: 'RAWASI ALINJAZ RECRUITMENT',
        email: 'rawasirec@gmail.com',
        tel: '+251911223344',
      }}
    />
  );
}
