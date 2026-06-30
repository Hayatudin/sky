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
  const Template = getTemplateComponent(templateId);
  return <Template candidate={candidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />;
}
