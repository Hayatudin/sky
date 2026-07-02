import React from 'react';
import { Candidate } from '@/types';
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
        <div className="text-center mb-2">
          <h1 className="text-[15px] font-bold tracking-wide uppercase">{branding.agencyName}</h1>
          <div className="border-t border-black mt-1 mb-1" />
          <div className="flex justify-between text-[11px] font-bold italic px-1">
            <span>EMAIL:-{branding.email}</span>
            <span>tel :{branding.tel}</span>
          </div>
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
                {[
                  ['Nationality', candidate.passportData?.nationality, 'الجنسيه'],
                  ['Passport No.', candidate.passportData?.passportNumber, 'رقم جواز السفر', true],
                  ['Religion', candidate.personalInfo?.religion, 'الديانة'],
                  ['Date of Birth', formatPassportDate(candidate.passportData?.dateOfBirth), 'تاريخ الولادة'],
                  ['Place of Birth', candidate.passportData?.placeOfBirth, 'مكان الولادة'],
                  [
                    'Complete Address',
                    candidate.personalInfo?.city || candidate.personalInfo?.address || '',
                    'العنوان الكامل',
                  ],
                  ['Marital Status', candidate.personalInfo?.maritalStatus, 'الحاله الزوجية'],
                  ['No. of Children', String(candidate.personalInfo?.numberOfChildren ?? ''), 'عدد الاطفال'],
                  ['Height', candidate.personalInfo?.height ? `${candidate.personalInfo.height}CM` : '', 'ارتفاع'],
                  ['Weight', candidate.personalInfo?.weight ? `${candidate.personalInfo.weight}KG` : '', 'وزن'],
                ].map(([label, value, ar, bold]) => (
                  <tr key={label as string}>
                    <td className={`${cellBorder} px-2 py-1.5 ${labelClass} w-[30%]`}>{label}</td>
                    <td
                      className={`${cellBorder} px-2 py-1.5 text-center w-[45%] uppercase ${bold ? 'font-bold' : 'font-medium'}`}
                    >
                      {value}
                    </td>
                    <td className={`${cellBorder} px-2 py-1.5 text-right font-bold w-[25%]`} dir="rtl">
                      {ar}
                    </td>
                  </tr>
                ))}
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
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass} w-[30%]`}>English</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center w-[45%]`}>{hasLang(candidate, 'ENGLISH')}</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold w-[25%]`} dir="rtl">الإنجليزيه</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Arabic</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center`}>{hasLang(candidate, 'ARABIC')}</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">العربيه</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Education</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center uppercase text-[11px]`}>
                    {candidate.personalInfo?.educationLevel}
                  </td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">المستوي</td>
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
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass} w-[30%]`}>Period</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center w-[45%] uppercase text-red-600 font-bold`}>
                    {expPeriod}
                  </td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold w-[25%]`} dir="rtl">المده</td>
                </tr>
                <tr>
                  <td className={`${cellBorder} px-2 py-1.5 ${labelClass}`}>Country</td>
                  <td className={`${cellBorder} px-2 py-1.5 text-center uppercase text-red-600 font-bold`}>
                    {expCountry}
                  </td>
                  <td className={`${cellBorder} px-2 py-1.5 text-right font-bold`} dir="rtl">البلد</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Skills */}
        <table className={`w-full border-collapse ${cellBorder} text-[12px] mt-2`}>
          <thead>
            <tr className={headerBg}>
              <th colSpan={6} className={`${cellBorder} text-center font-bold py-1`}>
                Skills & Experience <span dir="rtl" className="ml-2 font-bold">خبرة العمل</span>
              </th>
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

      <PassportPage candidate={candidate} />
    </div>
  );
}
