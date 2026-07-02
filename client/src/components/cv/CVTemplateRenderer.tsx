'use client';

import React from 'react';
import { Candidate } from '@/types';
import { getTemplateComponent } from '@/lib/cv-templates';

interface CVTemplateRendererProps {
  templateId: string;
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

// Builds a safe candidate object with all fields guaranteed to be non-null
function makeSafeCandidate(c: Candidate): Candidate {
  const pi = c.personalInfo || ({} as any);
  return {
    ...c,
    passportData: {
      passportNumber: c.passportData?.passportNumber ?? '',
      surname:        c.passportData?.surname ?? '',
      givenNames:     c.passportData?.givenNames ?? '',
      dateOfBirth:    c.passportData?.dateOfBirth ?? '',
      gender:         c.passportData?.gender ?? '',
      nationality:    c.passportData?.nationality ?? '',
      issuingCountry: c.passportData?.issuingCountry ?? '',
      dateOfIssue:    c.passportData?.dateOfIssue ?? '',
      dateOfExpiry:   c.passportData?.dateOfExpiry ?? '',
      placeOfBirth:   c.passportData?.placeOfBirth ?? '',
    },
    personalInfo: {
      idNumber:                  pi.idNumber                  ?? '',
      job:                       pi.job                       ?? '',
      maritalStatus:             pi.maritalStatus             ?? '',
      numberOfChildren:          pi.numberOfChildren          ?? 0,
      religion:                  pi.religion                  ?? '',
      bloodType:                 pi.bloodType                 ?? '',
      height:                    pi.height                    ?? '',
      weight:                    pi.weight                    ?? '',
      phone:                     pi.phone                     ?? '',
      email:                     pi.email                     ?? '',
      address:                   pi.address                   ?? '',
      city:                      pi.city                      ?? '',
      state:                     pi.state                     ?? '',
      country:                   pi.country                   ?? '',
      educationLevel:            pi.educationLevel            ?? '',
      languages:                 Array.isArray(pi.languages)       ? pi.languages       : [],
      workExperience:            Array.isArray(pi.workExperience)  ? pi.workExperience  : [],
      skills:                    Array.isArray(pi.skills)          ? pi.skills          : [],
      medicalStatus:             pi.medicalStatus             ?? 'Pending',
      knownConditions:           pi.knownConditions           ?? '',
      additionalPhones:          Array.isArray(pi.additionalPhones) ? pi.additionalPhones : [],
      emergencyContactName:      pi.emergencyContactName      ?? '',
      emergencyContactRelation:  pi.emergencyContactRelation  ?? '',
      emergencyContactPhone:     pi.emergencyContactPhone     ?? '',
      emergencyContactAddress:   pi.emergencyContactAddress   ?? '',
      salary:                    pi.salary                    ?? '1000SR',
      // preserve any extra fields (brokerId, document URLs etc.)
      ...(pi.brokerId !== undefined      ? { brokerId: pi.brokerId }           : {}),
      ...(pi.cocDocumentUrl !== undefined ? { cocDocumentUrl: pi.cocDocumentUrl } : {}),
      ...(pi.medicalDocumentUrl !== undefined ? { medicalDocumentUrl: pi.medicalDocumentUrl } : {}),
      ...(pi.candidateIdImageUrl !== undefined ? { candidateIdImageUrl: pi.candidateIdImageUrl } : {}),
      ...(pi.relativeIdImageUrl !== undefined ? { relativeIdImageUrl: pi.relativeIdImageUrl } : {}),
      ...(pi.labourIdUrl !== undefined    ? { labourIdUrl: pi.labourIdUrl }     : {}),
      ...(pi.biometricStatus !== undefined ? { biometricStatus: pi.biometricStatus } : {}),
      ...(pi.medicalDate !== undefined    ? { medicalDate: pi.medicalDate }     : {}),
      ...(pi.biometricDate !== undefined  ? { biometricDate: pi.biometricDate } : {}),
    },
  };
}

export default function CVTemplateRenderer({
  templateId,
  candidate,
  facePhoto,
  fullBodyPhoto,
}: CVTemplateRendererProps) {
  if (!candidate || !candidate.passportData) {
    return (
      <div className="flex items-center justify-center py-20 bg-white min-h-[700px]">
        <p className="text-gray-400 text-sm">Loading candidate data...</p>
      </div>
    );
  }

  const safeCandidate = makeSafeCandidate(candidate);
  const Template = getTemplateComponent(templateId);
  return <Template candidate={safeCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />;
}
