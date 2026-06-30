import React from 'react';
import { Candidate } from '@/types';
import RawasiTemplate from '@/components/cv/templates/RawasiTemplate';
import AzmTemplate from '@/components/cv/templates/AzmTemplate';
import MazayaTemplate from '@/components/cv/templates/MazayaTemplate';

export type CVTemplateId = 'rawasi' | 'azm' | 'mazaya';

export const DEFAULT_CV_TEMPLATE_ID: CVTemplateId = 'rawasi';

export interface CVTemplateDefinition {
  id: CVTemplateId;
  name: string;
  shortName: string;
  fullName: string;
  category: string;
  description: string;
  color: string;
  textColor: string;
  bgLight: string;
  component: React.ComponentType<{
    candidate: Candidate;
    facePhoto: string | null;
    fullBodyPhoto: string | null;
  }>;
}

export const CV_TEMPLATES: CVTemplateDefinition[] = [
  {
    id: 'rawasi',
    name: 'Rawasi',
    shortName: 'Rawasi',
    fullName: 'RAWASI ALIMTIAZ AGENCY',
    category: 'Classic',
    description: 'Rawasi Alimtiaz agency',
    color: 'bg-primary',
    textColor: 'text-primary',
    bgLight: 'bg-primary-50',
    component: RawasiTemplate,
  },
  {
    id: 'azm',
    name: 'Azm',
    shortName: 'Azm',
    fullName: 'AZM ALINJAZ RECRUITMENT',
    category: 'Classic',
    description: 'Azm Alinjaz agency',
    color: 'bg-primary-dark',
    textColor: 'text-primary-dark',
    bgLight: 'bg-primary-50',
    component: AzmTemplate,
  },
  {
    id: 'mazaya',
    name: 'Mazaya',
    shortName: 'Mazaya',
    fullName: 'MAZAYA RECRUITMENT AGENT',
    category: 'Professional',
    description: 'Mazaya recruitment agent',
    color: 'bg-primary-light',
    textColor: 'text-primary-light',
    bgLight: 'bg-primary-50',
    component: MazayaTemplate,
  },
];

export const CV_TEMPLATE_OPTIONS = CV_TEMPLATES.map(({ id, name }) => ({ id, name }));

export const CV_TEMPLATE_NAMES: Record<CVTemplateId, string> = Object.fromEntries(
  CV_TEMPLATES.map((t) => [t.id, t.name])
) as Record<CVTemplateId, string>;

export const CV_TEMPLATE_FULL_NAMES: Record<CVTemplateId, string> = Object.fromEntries(
  CV_TEMPLATES.map((t) => [t.id, t.fullName])
) as Record<CVTemplateId, string>;

const LEGACY_TEMPLATE_MAP: Record<string, CVTemplateId> = {
  alm: 'rawasi',
  ka7: 'rawasi',
  ku2: 'rawasi',
  ma: 'mazaya',
  ra: 'rawasi',
  ussus: 'rawasi',
  'al-shablan': 'rawasi',
  alshablan: 'rawasi',
  vision: 'rawasi',
};

export function normalizeTemplateId(id?: string | null): CVTemplateId {
  if (!id) return DEFAULT_CV_TEMPLATE_ID;
  const clean = id.replace(/^tmpl-/, '').toLowerCase();
  if (CV_TEMPLATES.some((t) => t.id === clean)) return clean as CVTemplateId;
  return LEGACY_TEMPLATE_MAP[clean] || DEFAULT_CV_TEMPLATE_ID;
}

export function getTemplateById(id?: string | null): CVTemplateDefinition {
  return CV_TEMPLATES.find((t) => t.id === normalizeTemplateId(id)) || CV_TEMPLATES[0];
}

export function getTemplateComponent(id?: string | null) {
  return getTemplateById(id).component;
}

export function getTemplateName(id?: string | null): string {
  return getTemplateById(id).name;
}

export const VALID_TEMPLATE_IDS = CV_TEMPLATES.map((t) => t.id);
