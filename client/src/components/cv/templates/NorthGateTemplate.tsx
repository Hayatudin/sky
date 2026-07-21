import React from 'react';
import { Candidate } from '@/types';
import RawasiAzmLayout from './RawasiAzmLayout';
import PassportPage from '../shared/PassportPage';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function NorthGateTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  return (
    <>
      <RawasiAzmLayout
        candidate={candidate}
        facePhoto={facePhoto}
        fullBodyPhoto={fullBodyPhoto}
        branding={{
          agencyName: 'NORTH GATE RECRUITMENT OFFICE',
          email: '',
          tel: '',
          headerImage: '/Noth-header.png',
        }}
      />
      <PassportPage candidate={candidate} />
    </>
  );
}
