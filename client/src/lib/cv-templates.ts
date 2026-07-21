import React from 'react';
import { Candidate } from '@/types';
import RawasiTemplate from '@/components/cv/templates/RawasiTemplate';
import AzmTemplate from '@/components/cv/templates/AzmTemplate';
import MazayaTemplate from '@/components/cv/templates/MazayaTemplate';
import NorthGateTemplate from '@/components/cv/templates/NorthGateTemplate';
import DaeymanTemplate from '@/components/cv/templates/DaeymanTemplate';

export type CVTemplateId = 'rawasi' | 'azm' | 'mazaya' | 'northgate' | 'daeyman';

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
  agency: 'Sky' | 'Fenero';
  component: React.ComponentType<{
    candidate: Candidate;
    facePhoto: string | null;
    fullBodyPhoto: string | null;
  }>;
}

export const CV_TEMPLATES: CVTemplateDefinition[] = [
  // ── Sky Templates ──────────────────────────────────────────────────
  {
    id: 'rawasi',
    name: 'Rawasi',
    shortName: 'Rawasi',
    fullName: 'RAWASI ALINJAZ RECRUITMENT',
    category: 'Classic',
    description: 'Rawasi Alinjaz agency',
    color: 'bg-primary',
    textColor: 'text-primary',
    bgLight: 'bg-primary-50',
    agency: 'Sky',
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
    agency: 'Sky',
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
    agency: 'Sky',
    component: MazayaTemplate,
  },
  // ── Fenero Templates ───────────────────────────────────────────────
  {
    id: 'northgate',
    name: 'North Gate',
    shortName: 'NorthGate',
    fullName: 'NORTH GATE RECRUITMENT OFFICE',
    category: 'Professional',
    description: 'North Gate recruitment office',
    color: 'bg-sky-600',
    textColor: 'text-sky-700',
    bgLight: 'bg-sky-50',
    agency: 'Fenero',
    component: NorthGateTemplate,
  },
  {
    id: 'daeyman',
    name: 'Daeyman Alawael',
    shortName: 'Daeyman',
    fullName: 'DAEYMAN ALAWAEL RECRUITMET AGENT',
    category: 'Professional',
    description: 'Daeyman Alawael recruitment agent',
    color: 'bg-cyan-600',
    textColor: 'text-cyan-700',
    bgLight: 'bg-cyan-50',
    agency: 'Fenero',
    component: DaeymanTemplate,
  },
];

export const CV_TEMPLATE_OPTIONS = CV_TEMPLATES.map(({ id, name }) => ({ id, name }));

export const CV_TEMPLATE_NAMES: Record<CVTemplateId, string> = Object.fromEntries(
  CV_TEMPLATES.map((t) => [t.id, t.name])
) as Record<CVTemplateId, string>;

export const CV_TEMPLATE_FULL_NAMES: Record<CVTemplateId, string> = Object.fromEntries(
  CV_TEMPLATES.map((t) => [t.id, t.fullName])
) as Record<CVTemplateId, string>;

/** Return templates filtered by the user's majorAgency */
export function getTemplatesForAgency(agency?: string | null): CVTemplateDefinition[] {
  const a = agency || 'Sky';
  return CV_TEMPLATES.filter((t) => t.agency === a);
}

/** Return the default template ID for a given agency */
export function getDefaultTemplateForAgency(agency?: string | null): CVTemplateId {
  const a = agency || 'Sky';
  if (a === 'Fenero') return 'northgate';
  return 'rawasi';
}

const LEGACY_TEMPLATE_MAP: Record<string, CVTemplateId> = {
  rawasi: 'rawasi',
  ra: 'rawasi',
  almersah: 'rawasi',
  almala: 'rawasi',
  alm: 'rawasi',
  azm: 'azm',
  mazaya: 'mazaya',
  ma: 'mazaya',
  ka7: 'rawasi',
  ku2: 'rawasi',
  ussus: 'rawasi',
  'al-shablan': 'rawasi',
  alshablan: 'rawasi',
  vision: 'rawasi',
  northgate: 'northgate',
  'north-gate': 'northgate',
  daeyman: 'daeyman',
  'daeyman-alawael': 'daeyman',
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
