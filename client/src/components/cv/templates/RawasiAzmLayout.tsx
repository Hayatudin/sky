import React from 'react';
import { Candidate } from '@/types';
import { cleanLabourId } from '@/lib/utils';
import PassportPage from '../shared/PassportPage';
import {
  calculateAge,
  formatPassportDate,
  getFullName,
  getExperienceSummary,
  hasLang,
  hasSkill,
} from '../cvHelpers';

export interface AgencyBranding {
  agencyName: string;
  email: string;
  tel: string;
}

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
  branding: AgencyBranding;
}

const cellBorder = 'border-[1.5px] border-black';
const labelClass = 'text-[#0066cc] font-bold';
const headerBg = 'bg-[#b0c4de] !print:color-adjust-exact';

export default function RawasiAzmLayout({ candidate, facePhoto, fullBodyPhoto, branding }: CVTemplateProps) {
  const fullName = getFullName(candidate);
  const age = calculateAge(candidate.passportData?.dateOfBirth);
  const { expPeriod, expCountry } = getExperienceSummary(candidate);
  const phone = [
    candidate.personalInfo?.phone,
    candidate.personalInfo?.emergencyContactPhone,
  ].filter(Boolean).join(' / ');

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black font-sans shadow-lg print:shadow-none" dir="ltr">
      <div className="p-[10mm] min-h-[297mm] box-border relative page-break-after-always">
        {/* Agency Header */}
        <div className="text-center mb-1">
          <h1 className="text-[14px] font-bold tracking-wide uppercase">{branding.agencyName}</h1>
          <div className="border-t-[3.5px] border-[#800000] mt-1.5 mb-1" />
          <div className="flex justify-between text-[16px] font-black px-1 mt-1">
            <span>EMAIL:-{branding.email}</span>
            <span>tel :{branding.tel}</span>
          </div>
        </div>

        {/* Broker Name */}
        <div className="text-left text-[14px] font-bold italic px-1 mb-1.5 uppercase">
          {candidate.broker?.name || ''}
        </div>

        {/* Face + Application Table */}
        <div className="flex gap-2 mb-2">
          <div className="w-[160px] shrink-0">
            <div className={`${cellBorder} h-[190px] w-full p-1 bg-white`}>
              {facePhoto ? (
                <img src={facePhoto} className="w-full h-full object-cover" alt="Face" />
              ) : (
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] text-center">
                  Face Photo
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <table className={`w-full border-collapse ${cellBorder} text-[13px] leading-tight`}>
              <thead>
                <tr>
                  <th colSpan={3} className={`${cellBorder} text-center text-[#0066cc] font-bold text-[18px] py-1.5 uppercase`}>
                    APPLICATION FOR EMPLOYMENT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass} w-[25%]`}>Full Name</td>
                  <td className={`${cellBorder} px-2 py-1.5 font-bold text-center w-[50%] uppercase`}>{fullName}</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold w-[25%]`} dir="rtl">الاسم الكامل</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Telephone</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center font-medium`}>{phone}</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">رقم هاتف</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Position</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center uppercase font-bold`}>
                    {candidate.personalInfo?.job || 'HOUSE WORKER'}
                  </td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">موضع</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Age</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center font-medium`}>{age}</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">عمر</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Date of Expiry</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center font-medium`}>
                    {formatPassportDate(candidate.passportData?.dateOfExpiry)}
                  </td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">تاريخ الانتهاء</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Body + Detail Tables */}
        <div className="flex gap-2 items-stretch">
          <div className="w-[270px] shrink-0 flex flex-col">
            <div className={`${cellBorder} p-0 bg-white flex-1 relative min-h-[420px] overflow-hidden`}>
              {fullBodyPhoto ? (
                <img src={fullBodyPhoto} className="w-full h-full object-cover" alt="Full Body" />
              ) : (
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] text-center">
                  Full Body Photo
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-0">
            <table className={`w-full border-collapse ${cellBorder} text-[13px] leading-tight mb-[-1.5px]`}>
              <thead>
                <tr className={headerBg}>
                  <th colSpan={3} className={`${cellBorder} text-center font-bold py-1.5`}>
                    Details of Applicant <span dir="rtl" className="ml-2 font-bold">بيانات مقدم الطلب</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass} w-[30%]`}>Nationality</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-semibold w-[40%] uppercase`}>{candidate.passportData?.nationality}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold w-[30%]`} dir="rtl">الجنسية</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Passport No.</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-bold uppercase`}>{candidate.passportData?.passportNumber}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">رقم جواز السفر</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Religion</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium uppercase`}>{candidate.personalInfo?.religion}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">الديانة</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Date of Birth</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium`}>
                    {formatPassportDate(candidate.passportData?.dateOfBirth)}
                  </td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">تاريخ الولادة</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Place of Birth</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium uppercase`}>{candidate.passportData?.placeOfBirth}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">مكان الولادة</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Complete Address</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium uppercase`}>
                    {[candidate.personalInfo?.address, candidate.personalInfo?.city].filter(Boolean).join(', ')}
                  </td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">العنوان الكامل</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Marital Status</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium uppercase`}>{candidate.personalInfo?.maritalStatus}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">الحالة الزوجية</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>No. of Children</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium`}>{candidate.personalInfo?.numberOfChildren}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">عدد الاطفال</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Height</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium`}>{candidate.personalInfo?.height ? `${candidate.personalInfo.height}CM` : '—'}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">الارتفاع</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Weight</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium`}>{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight}KG` : '—'}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">الوزن</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Labour ID</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium`}>{candidate.labourId || '—'}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">هوية العمل</td>
                </tr>
              </tbody>
            </table>

            <table className={`w-full border-collapse ${cellBorder} text-[13px] leading-tight mb-[-1.5px]`}>
              <thead>
                <tr className={headerBg}>
                  <th colSpan={3} className={`${cellBorder} text-center font-bold py-1.5`}>
                    Languages & Education <span dir="rtl" className="ml-2 font-bold">اللغة والتعليم</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass} w-[30%]`}>English</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-bold w-[40%]`}>
                    {hasLang(candidate, 'ENGLISH')}
                  </td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold w-[30%]`} dir="rtl">الإنجليزية</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Arabic</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-bold`}>
                    {hasLang(candidate, 'ARABIC')}
                  </td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">العربية</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Education</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-semibold uppercase`}>
                    {candidate.personalInfo?.educationLevel || 'PRIMARY'}
                  </td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">المستوي المهني</td>
                </tr>
              </tbody>
            </table>

            <table className={`w-full border-collapse ${cellBorder} text-[13px] leading-tight`}>
              <thead>
                <tr className={headerBg}>
                  <th colSpan={3} className={`${cellBorder} text-center font-bold py-1.5`}>
                    Previous Employment Abroad <span dir="rtl" className="ml-2 font-bold">خبره خارج البلاد</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass} w-[30%]`}>Period</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-medium w-[40%]`}>{expPeriod}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold w-[30%]`} dir="rtl">المده</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Country</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center font-bold w-[40%] uppercase`}>{expCountry}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">البلد</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Skills Section */}
        <div className="mt-2">
          <div className="text-center font-bold text-[14px] mb-1">
            Skills & Experience <span dir="rtl" className="ml-1 font-bold">خبرة العمل</span>
          </div>
          <table className={`w-full border-collapse ${cellBorder} text-[12px] leading-tight`}>
            <thead>
              <tr className="hidden">
                <th className="w-[16.6%]" />
                <th className="w-[16.6%]" />
                <th className="w-[16.6%]" />
                <th className="w-[16.6%]" />
                <th className="w-[16.6%]" />
                <th className="w-[16.6%]" />
              </tr>
            </thead>
            <tbody>
              {[
                ['Ironing', 'IRONING', 'الكوي', 'Baby Sitting', 'BABY SITTING', 'عناية الرضيع'],
                ['Cooking', 'COOKING', 'الطبخ', 'Children Care', 'CHILDREN CARE', 'عناية الاطفال'],
                ['Arabic Cooking', 'ARABIC COOKING', 'الطبخ العربي', 'Tutoring', 'TUTORING', 'تعليم الأطفال'],
                ['Sewing', 'SEWING', 'خياطة', 'Cleaning', 'CLEANING', 'التنظيف'],
                ['Computer', 'COMPUTER', 'استخدام الكمبيوتر', 'Washing', 'WASHING', 'الغسيل'],
              ].map(([l1, s1, a1, l2, s2, a2]) => (
                <tr key={l1}>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass} w-[16.6%]`}>{l1}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center w-[16.6%]`}>{hasSkill(candidate, s1)}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold w-[16.6%]`} dir="rtl">{a1}</td>
                  <td className={`${cellBorder} px-1.5 py-1 ${labelClass} w-[16.6%]`}>{l2}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-center w-[16.6%]`}>{hasSkill(candidate, s2)}</td>
                  <td className={`${cellBorder} px-1.5 py-1 text-right font-bold w-[16.6%]`} dir="rtl">{a2}</td>
                </tr>
              ))}
              <tr>
                <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Other skills</td>
                <td className={`${cellBorder} px-1.5 py-1 text-center`}>NO</td>
                <td className={`${cellBorder} px-1.5 py-1 text-right font-bold`} dir="rtl">خبرات أخري</td>
                <td className={`${cellBorder} px-1.5 py-1 ${labelClass}`}>Remarks</td>
                <td className={`${cellBorder} px-1.5 py-1 text-center`} colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
