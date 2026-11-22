import React from 'react';
import { Candidate } from '@/types';
import {
  calculateAge,
  formatPassportDate,
  getFullName,
  getCleanNationality,
  getExperienceSummary,
  hasLang,
  isExperienced,
} from '../cvHelpers';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

/* ─── shared cell style ─── */
const cell = 'border border-black px-2 py-[3px] text-[11px] leading-tight';
const labelEn = `${cell} font-bold text-black`;
const labelAr = `${cell} font-bold text-right`;
const valueCell = `${cell} text-center`;

export default function RawasiTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  const fullName = getFullName(candidate);
  const age = calculateAge(candidate.passportData?.dateOfBirth);
  const { expPeriod, expCountry } = getExperienceSummary(candidate);
  const experienced = isExperienced(candidate);

  const phone = [
    candidate.personalInfo?.phone,
    candidate.personalInfo?.emergencyContactPhone,
  ].filter(Boolean).join(' / ');

  const langLevel = (lang: string) => {
    if (lang === 'ENGLISH') return experienced ? 'Good' : 'Fair';
    if (lang === 'ARABIC') return experienced ? 'Good' : 'Fair';
    return 'Fair';
  };

  return (
    <div
      className="w-full max-w-[210mm] mx-auto bg-white text-black shadow-lg print:shadow-none relative overflow-hidden"
      dir="ltr"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      <div className="min-h-[297mm] box-border relative page-break-after-always">
        {/* ─── Background image with low opacity ─── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/rewasi.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.12,
          }}
        />

        {/* ─── Content on top of background ─── */}
        <div className="relative z-10 px-[12mm] py-[8mm]">

          {/* ═══════ HEADER ═══════ */}
          <div className="text-center mb-3">
            <div className="text-[11px] font-bold" dir="rtl">شركة رواسي الامتياز للاستقدام</div>
            <div className="text-[10px] font-semibold tracking-wide">Rawasi Alimtiaz For Recruitment</div>
          </div>

          {/* ═══════ TOP ROW: Position / Country / CV NO ═══════ */}
          <table className="w-full border-collapse mb-0">
            <tbody>
              <tr>
                <td className={`${cell} font-bold w-[15%]`}>Position:</td>
                <td className={`${cell} font-bold uppercase w-[25%]`}>
                  {candidate.personalInfo?.job || 'HOUSE MAID'}
                </td>
                <td className={`${cell} font-bold w-[15%]`}>Country:</td>
                <td className={`${cell} font-bold w-[15%]`}>KSA</td>
                <td className={`${cell} font-bold w-[10%]`}>CV NO :</td>
                <td className={`${cell} w-[20%]`}>{candidate.labourId || ''}</td>
              </tr>
              <tr>
                <td className={`${cell} font-bold`}>Full Name:</td>
                <td className={`${cell} font-bold uppercase`} colSpan={3}>{fullName}</td>
                <td className={`${cell} text-right font-bold`} colSpan={2} dir="rtl">الاسم بالكامل</td>
              </tr>
              <tr>
                <td className={`${cell} font-bold`}>Mobile No.:</td>
                <td className={`${cell}`} colSpan={3}>{phone}</td>
                <td className={`${cell} font-bold`}>REF:NO.</td>
                <td className={`${cell}`}></td>
              </tr>
            </tbody>
          </table>

          {/* ═══════ PASSPORT DETAILS + FACE PHOTO ═══════ */}
          <div className="flex mt-3 gap-0">
            {/* Left: Passport Details */}
            <div className="flex-1">
              <div className="font-bold text-[12px] mb-1 flex items-center gap-3">
                <span>PASSPORT DETAILS</span>
                <span dir="rtl" className="font-bold">بيانات جـواز السـفـر</span>
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={labelEn} style={{ width: '30%' }}>Passport No.</td>
                    <td className={valueCell} style={{ width: '35%' }}>{candidate.passportData?.passportNumber}</td>
                    <td className={labelAr} style={{ width: '35%' }} dir="rtl">رقـم جـواز السـفـر</td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Date of Issue</td>
                    <td className={valueCell}>{formatPassportDate(candidate.passportData?.dateOfIssue)}</td>
                    <td className={labelAr} dir="rtl">تاريخ الإصدار</td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Date of Expire</td>
                    <td className={valueCell}>{formatPassportDate(candidate.passportData?.dateOfExpiry)}</td>
                    <td className={labelAr} dir="rtl">تاريخ الانتهـــاء</td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Place of Issue</td>
                    <td className={valueCell}>{candidate.passportData?.placeOfBirth}</td>
                    <td className={labelAr} dir="rtl">ملكـــان الإصدار</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Face Photo */}
            <div className="w-[150px] ml-3 shrink-0">
              <div className="border border-black h-[140px] w-full bg-white flex items-center justify-center overflow-hidden">
                {facePhoto ? (
                  <img src={facePhoto} className="w-full h-full object-cover" alt="Face" />
                ) : (
                  <div className="text-xs text-gray-400 text-center">Photo</div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════ APPLICANTS DETAILS + FULL BODY PHOTO ═══════ */}
          <div className="flex mt-2 gap-0">
            {/* Left: Applicant details */}
            <div className="flex-1">
              <div className="font-bold text-[12px] mb-1 flex items-center gap-3">
                <span>APPLICANTS</span>
                <span dir="rtl" className="font-bold">بيانات صــاحب الطـلـب</span>
              </div>
              <div className="text-[10px] italic mb-1 font-bold">DETAILSOF</div>
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${labelEn} text-red-600`} style={{ width: '30%' }}>Nationality</td>
                    <td className={valueCell} style={{ width: '35%' }}>{getCleanNationality(candidate)}</td>
                    <td className={labelAr} style={{ width: '35%' }} dir="rtl">الجـنسـيـة</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Religion</td>
                    <td className={valueCell}>{candidate.personalInfo?.religion}</td>
                    <td className={labelAr} dir="rtl">الـديـانـة</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Date of Birth</td>
                    <td className={valueCell}>{formatPassportDate(candidate.passportData?.dateOfBirth)}</td>
                    <td className={labelAr} dir="rtl">تـاريخ الميلاد</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Original Age</td>
                    <td className={valueCell}>{age}</td>
                    <td className={labelAr} dir="rtl">الـعمـر</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Place of Birth</td>
                    <td className={valueCell}>{candidate.passportData?.placeOfBirth}</td>
                    <td className={labelAr} dir="rtl">مكان الولادة</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Marital Status</td>
                    <td className={valueCell}>{candidate.personalInfo?.maritalStatus}</td>
                    <td className={labelAr} dir="rtl">الحالة الاجـتماعية</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>No. of Children</td>
                    <td className={valueCell}>{candidate.personalInfo?.numberOfChildren}</td>
                    <td className={labelAr} dir="rtl">عدد الأطفال</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Height</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : '—'}
                    </td>
                    <td className={labelAr} dir="rtl">الطول</td>
                  </tr>
                  <tr>
                    <td className={`${labelEn} text-red-600`}>Weight</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : '—'}
                    </td>
                    <td className={labelAr} dir="rtl">الوزن</td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Living Town</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.city || candidate.personalInfo?.address}
                    </td>
                    <td className={labelAr} dir="rtl">مـدـان السـكـن</td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Education;</td>
                    <td className={valueCell}>{candidate.personalInfo?.educationLevel || 'PRIMARY'}</td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={labelEn}>In case of<br/>Emergency:</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.emergencyContactName}
                      {candidate.personalInfo?.emergencyContactPhone ? ` - ${candidate.personalInfo.emergencyContactPhone}` : ''}
                    </td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Salary:</td>
                    <td className={valueCell}>{candidate.personalInfo?.salary || '1000SR'}</td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={labelEn}>Address:</td>
                    <td className={valueCell}>
                      {[candidate.personalInfo?.address, candidate.personalInfo?.city].filter(Boolean).join(', ')}
                    </td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Full Body Photo */}
            <div className="w-[170px] ml-3 shrink-0">
              <div className="border border-black w-full bg-white flex items-center justify-center overflow-hidden" style={{ height: '420px' }}>
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} className="w-full h-full object-cover" alt="Full Body" />
                ) : (
                  <div className="text-xs text-gray-400 text-center">Full Body<br/>Photo</div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════ PREVIOUS EMPLOYMENT ABROAD ═══════ */}
          <div className="mt-4">
            <div className="font-bold text-[12px] mb-1 underline">PREVIOUS EMPLOYMENT ABROAD</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <td className={`${cell} font-bold w-[50%]`}>
                    Country<span dir="rtl" className="float-right font-bold">الـبـــلـد</span>
                  </td>
                  <td className={`${cell} font-bold w-[50%]`}>
                    <span className="text-red-600">Period</span>
                    <span dir="rtl" className="float-right font-bold">المــدة</span>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={cell}>{expCountry || ''}</td>
                  <td className={cell}>{expPeriod || ''}</td>
                </tr>
                <tr>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ═══════ LANGUAGE SECTION ═══════ */}
          <div className="mt-4 flex gap-4">
            {/* Left: English / Arabic language table */}
            <div className="flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${cell} text-left font-bold w-[33%]`}>ENGLISH</th>
                    <th className={`${cell} text-center font-bold w-[34%]`}></th>
                    <th className={`${cell} text-right font-bold w-[33%]`} dir="rtl">اللـقــة الـعـربـيـة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${cell} text-red-600 font-bold`}>Fair</td>
                    <td className={`${cell} text-center`}>{!experienced ? '✓' : ''}</td>
                    <td className={`${cell} text-right font-bold`} dir="rtl">وسـط</td>
                  </tr>
                  <tr>
                    <td className={`${cell} text-red-600 font-bold`}>Good</td>
                    <td className={`${cell} text-center`}>{experienced ? '✓' : ''}</td>
                    <td className={`${cell} text-right font-bold`} dir="rtl">جـيـــد</td>
                  </tr>
                  <tr>
                    <td className={`${cell} text-red-600 font-bold`}>Fluent</td>
                    <td className={`${cell} text-center`}></td>
                    <td className={`${cell} text-right font-bold`} dir="rtl">ممـتـاز</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Remarks */}
            <div className="flex-1">
              <div className="font-bold text-[12px] mb-1">REMARKS:──────────────</div>
              <div className="border-b border-black mb-2 w-full">&nbsp;</div>
              <div className="border-b border-black mb-2 w-full">&nbsp;</div>
              <div className="border-b border-black mb-2 w-full">&nbsp;</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
