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

/** Extracts a clean nationality without any appended experience text (e.g. "BAHRAINYEARS OF EXPERIENCE: 1" -> "BAHRAIN") */
export function getCleanNationality(candidate: Candidate): string {
  const raw = candidate.passportData?.nationality || (candidate as any).nationality || '';
  if (!raw) return 'ETHIOPIAN';

  // Match and strip any "YEARS OF EXPERIENCE..." string appended to nationality
  const match = raw.match(/^(.*?)(?:\s*YEARS?\s*(?:OF\s*)?EXPERIENCE.*)$/i);
  let cleaned = match ? match[1].trim() : raw.trim();

  // Strip trailing punctuation/dashes
  cleaned = cleaned.replace(/[\s\:\-]+$/, '').trim();

  return cleaned.toUpperCase() || 'ETHIOPIAN';
}

export function getExperienceSummary(candidate: Candidate) {
  let expPeriod = '0 YEAR';
  let expCountry = '';
  let expPosition = '';

  const exps = candidate.personalInfo?.workExperience?.filter((e) => e.experienceStatus === 'Have experience' || Number(e.yearsOfExperience) > 0) || [];
  if (exps.length > 0) {
    expPeriod = exps.map((e) => `${e.yearsOfExperience} YEAR${Number(e.yearsOfExperience) !== 1 ? 'S' : ''}`).join(' + ');
    expCountry = exps.map((e) => e.country).join(', ');
    expPosition = exps.map((e) => (e as { position?: string }).position || candidate.personalInfo?.job || '').join(', ');
  } else {
    // If workExperience array is empty, check if experience info was embedded in nationality string (e.g. "BAHRAINYEARS OF EXPERIENCE: 1")
    const rawNat = candidate.passportData?.nationality || (candidate as any).nationality || '';
    const natExpMatch = rawNat.match(/^(.*?)\s*YEARS?\s*(?:OF\s*)?EXPERIENCE\s*:?\s*(\d+)?/i);
    if (natExpMatch) {
      const extractedCountry = natExpMatch[1].trim();
      const extractedYears = natExpMatch[2] || '1';
      if (extractedCountry) expCountry = extractedCountry.toUpperCase();
      expPeriod = `${extractedYears} YEAR${Number(extractedYears) !== 1 ? 'S' : ''}`;
    }
  }

  return { expPeriod, expCountry, expPosition };
}

export function isExperienced(candidate: Candidate) {
  const { expPeriod } = getExperienceSummary(candidate);
  if (expPeriod && expPeriod !== '0 YEAR' && expPeriod !== '0 YEARS') return true;
  return candidate.personalInfo?.workExperience?.some((e) => e.experienceStatus === 'Have experience') || false;
}

export function hasLang(candidate: Candidate, lang: string) {
  const experienced = isExperienced(candidate);
  return experienced ? 'YES' : 'NO';
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

export function getPositionWithSalary(candidate: Candidate) {
  const job = (candidate.personalInfo?.job || 'HOUSE MAID').toUpperCase();
  const salary = candidate.salary || candidate.personalInfo?.salary || '1000SR';
  return `${job}-${salary}`;
}
