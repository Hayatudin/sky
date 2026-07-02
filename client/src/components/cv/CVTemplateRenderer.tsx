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

export default function CVTemplateRenderer({
  templateId,
  candidate,
  facePhoto,
  fullBodyPhoto,
}: CVTemplateRendererProps) {
  // Guard: don't render if candidate is missing critical passport data
  if (!candidate || !candidate.passportData) {
    return (
      <div className="flex items-center justify-center py-20 bg-white min-h-[700px]">
        <p className="text-gray-400 text-sm">Loading candidate data...</p>
      </div>
    );
  }

  // Ensure personalInfo is always an object with safe defaults
  const safeCandidate: Candidate = {
    ...candidate,
    passportData: {
      passportNumber: '',
      surname: '',
      givenNames: '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      issuingCountry: '',
      dateOfIssue: '',
      dateOfExpiry: '',
      placeOfBirth: '',
      ...candidate.passportData,
    },
    personalInfo: {
      idNumber: '',
      job: '',
      maritalStatus: '',
      numberOfChildren: 0,
      religion: '',
      bloodType: '',
      height: '',
      weight: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: '',
      educationLevel: '',
      languages: [],
      workExperience: [],
      skills: [],
      medicalStatus: 'Pending',
      knownConditions: '',
      additionalPhones: [],
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      emergencyContactAddress: '',
      salary: '1000SR',
      ...(candidate.personalInfo || {}),
      // Ensure arrays are always arrays
      languages: Array.isArray(candidate.personalInfo?.languages) ? candidate.personalInfo.languages : [],
      workExperience: Array.isArray(candidate.personalInfo?.workExperience) ? candidate.personalInfo.workExperience : [],
      skills: Array.isArray(candidate.personalInfo?.skills) ? candidate.personalInfo.skills : [],
      additionalPhones: Array.isArray(candidate.personalInfo?.additionalPhones) ? candidate.personalInfo.additionalPhones : [],
    },
  };

  const Template = getTemplateComponent(templateId);
  return <Template candidate={safeCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />;
}
