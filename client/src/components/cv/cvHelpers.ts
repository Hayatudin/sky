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

/** Extracts a clean nationality without using destination experience countries or 'Experience' strings (e.g. "ETHIOPIA" -> "ETHIOPIAN") */
export function getCleanNationality(candidate: Candidate | any): string {
  if (!candidate) return 'ETHIOPIAN';
  const pd = candidate.passportData || candidate;
  const pi = candidate.personalInfo || candidate;

  const raw = pd?.nationality || candidate?.nationality || '';
  const issuing = pd?.issuingCountry || candidate?.issuingCountry || '';
  const country = pi?.country || candidate?.country || '';

  const resolveFromCountry = (c?: string) => {
    if (!c) return '';
    const upper = c.toUpperCase().trim();
    if (upper === 'ETH' || upper.includes('ETHIOPIA')) return 'ETHIOPIAN';
    if (upper === 'UGA' || upper.includes('UGANDA')) return 'UGANDAN';
    if (upper === 'KEN' || upper.includes('KENYA')) return 'KENYAN';
    if (upper === 'PHL' || upper.includes('PHILIPPINES')) return 'FILIPINO';
    if (upper === 'IDN' || upper.includes('INDONESIA')) return 'INDONESIAN';
    if (upper === 'BGD' || upper.includes('BANGLADESH')) return 'BANGLADESHI';
    if (upper === 'IND' || upper.includes('INDIA')) return 'INDIAN';
    return upper;
  };

  // Known Gulf / destination countries for employment abroad (work experience locations, not worker nationalities)
  const destCountries = ['BAHRAIN', 'SAUDI', 'KSA', 'UAE', 'DUBAI', 'ABU DHABI', 'KUWAIT', 'QATAR', 'OMAN', 'JORDAN', 'LEBANON', 'BEIRUT', 'EXPERIENCE'];

  // Check if raw nationality string contains an experience pattern or bad value like "Experience" or "BAHRAINYEARS..."
  const hasExpPattern = /\b(?:YEARS?\s*(?:OF\s*)?EXPERIENCE|EXPERIENCE)\b/i.test(raw);

  if (hasExpPattern) {
    return resolveFromCountry(country) || resolveFromCountry(issuing) || 'ETHIOPIAN';
  }

  let cleaned = raw.trim().toUpperCase();
  cleaned = cleaned.replace(/[\s\:\-]+$/, '').trim();

  // If nationality itself is a destination country (like BAHRAIN, SAUDI, KUWAIT), it was mistakenly filled with work experience country
  if (destCountries.some((c) => cleaned === c || cleaned.startsWith(c))) {
    return resolveFromCountry(country) || resolveFromCountry(issuing) || 'ETHIOPIAN';
  }

  return resolveFromCountry(cleaned) || resolveFromCountry(country) || resolveFromCountry(issuing) || 'ETHIOPIAN';
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
