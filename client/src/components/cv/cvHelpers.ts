import { Candidate } from '@/types';

export function calculateAge(dob: string | undefined) {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return String(age);
}

export function formatDate(dateString: string | undefined) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return dateString;
  }
}

export function formatPassportDate(dateString: string | undefined) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function getFullName(candidate: Candidate) {
  return `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
}

export function hasLang(candidate: Candidate, lang: string) {
  return candidate.personalInfo?.languages?.includes(lang) ? 'YES' : 'NO';
}

export function isExperienced(candidate: Candidate) {
  return candidate.personalInfo?.workExperience?.some((e) => e.experienceStatus === 'Have experience') || false;
}

export function hasSkill(candidate: Candidate, skill: string) {
  const s = skill.toUpperCase();
  const experienced = isExperienced(candidate);
  if (s === 'COOKING' || s === 'ARABIC COOKING') return experienced ? 'YES' : 'NO';
  if (s === 'IRONING') {
    return experienced ? (candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO') : 'NO';
  }
  if (
    s === 'CLEANING' ||
    s === 'WASHING' ||
    s === 'BABY' ||
    s === 'BABY SITTING' ||
    s === 'BABY_SITTING' ||
    s === 'CHILDREN CARE' ||
    s === 'CHILDREN_CARE'
  ) {
    return 'YES';
  }
  return candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO';
}

export function getExperienceSummary(candidate: Candidate) {
  let expPeriod = '0 YEAR';
  let expCountry = '';
  let expPosition = '';
  const exps = candidate.personalInfo?.workExperience?.filter((e) => e.experienceStatus === 'Have experience') || [];
  if (exps.length > 0) {
    expPeriod = exps.map((e) => `${e.yearsOfExperience} YEAR${Number(e.yearsOfExperience) !== 1 ? 'S' : ''}`).join(' + ');
    expCountry = exps.map((e) => e.country).join(', ');
    expPosition = exps.map((e) => (e as { position?: string }).position || candidate.personalInfo?.job || '').join(', ');
  }
  return { expPeriod, expCountry, expPosition };
}

export function getPositionWithSalary(candidate: Candidate) {
  const job = (candidate.personalInfo?.job || 'HOUSE MAID').toUpperCase();
  const salary = candidate.salary || candidate.personalInfo?.salary || '1000SR';
  return `${job}-${salary}`;
}
