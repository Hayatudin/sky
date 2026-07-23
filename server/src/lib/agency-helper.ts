export function getMajorAgencyFromServerUser(user: any): 'Fenero' | 'Sky' {
  if (!user) return 'Sky';
  const major = user.majorAgency || user.major_agency || user.agency || '';
  if (typeof major === 'string' && major.toLowerCase().includes('fenero')) return 'Fenero';
  const email = (user.email || '').toLowerCase();
  if (email.includes('fenero')) return 'Fenero';
  const name = (user.name || '').toLowerCase();
  if (name.includes('fenero')) return 'Fenero';
  return 'Sky';
}
