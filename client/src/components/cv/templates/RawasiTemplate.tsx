import React from 'react';
import { Candidate } from '@/types';
import {
  calculateAge,
  formatPassportDate,
  getFullName,
  getCleanNationality,
  getExperienceSummary,
  isExperienced,
} from '../cvHelpers';
import PassportPage from '../shared/PassportPage';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

/* ─── shared cell styles — larger font + bold ─── */
const cell = 'border border-black px-2 py-[4px] text-[15px] leading-tight font-bold';
const redLabel = `${cell} text-red-700`;
const labelAr = `${cell} text-right`;
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

  return (
    <div
      className="w-full max-w-[210mm] mx-auto bg-white text-black shadow-lg print:shadow-none relative overflow-hidden"
      dir="ltr"
      style={{ fontFamily: "'Roboto', 'Arial', sans-serif" }}
    >
      {/* ═══════════════ PAGE 1 — CV ═══════════════ */}
      <div className="min-h-[297mm] box-border relative page-break-after-always">
        {/* ─── Background image with low opacity ─── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/rewasi.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.5,
          }}
        />

        {/* ─── Content on top of background ─── */}
        <div className="relative z-10 px-[10mm]" style={{ paddingTop: '160px' }}>

          {/* ═══════ TOP TABLE: Position / Country / CV NO / Full Name / Mobile ═══════ */}
          <table className="border-collapse mb-0" style={{ width: '72%' }}>
            <tbody>
              <tr>
                <td className={`${redLabel} w-[18%]`}>Position:</td>
                <td className={`${cell} uppercase w-[27%]`}>
                  {candidate.personalInfo?.job || 'HOUSE MAID'}
                </td>
                <td className={`${redLabel} w-[15%]`}>Country:</td>
                <td className={`${cell} w-[12%]`}>KSA</td>
                <td className={`${redLabel} w-[13%]`}>CV NO :</td>
                <td className={`${cell} w-[15%]`}>{candidate.labourId || ''}</td>
              </tr>
              <tr>
                <td className={redLabel}>Full Name:</td>
                <td className={`${cell} uppercase`} colSpan={3}>{fullName}</td>
                <td className={`${cell} text-right`} colSpan={2} dir="rtl">الاسم بالكامل</td>
              </tr>
              <tr>
                <td className={redLabel}>Mobile No.:</td>
                <td className={cell} colSpan={3}>{phone}</td>
                <td className={cell}>REF:NO.</td>
                <td className={cell}></td>
              </tr>
            </tbody>
          </table>

          {/* ═══════ PASSPORT DETAILS + FACE PHOTO ═══════ */}
          <div className="flex mt-3 gap-0 items-start">
            <div style={{ width: '72%' }}>
              <div className="font-bold text-[16px] mb-1 flex items-center gap-3">
                <span>PASSPORT DETAILS</span>
                <span dir="rtl" className="font-bold">بيانات جـواز السـفـر</span>
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={redLabel} style={{ width: '28%' }}>Passport No.</td>
                    <td className={valueCell} style={{ width: '37%' }}>{candidate.passportData?.passportNumber}</td>
                    <td className={labelAr} style={{ width: '35%' }} dir="rtl">رقـم جـواز السـفـر</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Date of Issue</td>
                    <td className={valueCell}>{formatPassportDate(candidate.passportData?.dateOfIssue)}</td>
                    <td className={labelAr} dir="rtl">تاريخ الإصدار</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Date of Expire</td>
                    <td className={valueCell}>{formatPassportDate(candidate.passportData?.dateOfExpiry)}</td>
                    <td className={labelAr} dir="rtl">تاريخ الانتهـــاء</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Place of Issue</td>
                    <td className={valueCell}>{candidate.passportData?.placeOfBirth}</td>
                    <td className={labelAr} dir="rtl">ملكـــان الإصدار</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Face Photo */}
            <div className="ml-4 shrink-0" style={{ width: '140px' }}>
              <div className="border border-black bg-white flex items-center justify-center overflow-hidden" style={{ height: '130px', width: '140px' }}>
                {facePhoto ? (
                  <img src={facePhoto} className="w-full h-full object-cover" alt="Face" />
                ) : (
                  <div className="text-xs text-gray-400 text-center">Photo</div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════ APPLICANTS DETAILS + FULL BODY PHOTO ═══════ */}
          <div className="flex mt-2 gap-0 items-start">
            <div style={{ width: '72%' }}>
              <div className="font-bold text-[16px] mb-1 flex items-center gap-3">
                <span>APPLICANTS</span>
                <span dir="rtl" className="font-bold">بيانات صــاحب الطـلـب</span>
              </div>
              <div className="text-[13px] italic mb-1 font-bold">DETAILSOF</div>
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={redLabel} style={{ width: '28%' }}>Nationality</td>
                    <td className={valueCell} style={{ width: '37%' }}>{getCleanNationality(candidate)}</td>
                    <td className={labelAr} style={{ width: '35%' }} dir="rtl">الجـنسـيـة</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Religion</td>
                    <td className={valueCell}>{candidate.personalInfo?.religion}</td>
                    <td className={labelAr} dir="rtl">الـديـانـة</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Date of Birth</td>
                    <td className={valueCell}>{formatPassportDate(candidate.passportData?.dateOfBirth)}</td>
                    <td className={labelAr} dir="rtl">تـاريخ الميلاد</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Original Age</td>
                    <td className={valueCell}>{age}</td>
                    <td className={labelAr} dir="rtl">الـعمـر</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Place of Birth</td>
                    <td className={valueCell}>{candidate.passportData?.placeOfBirth}</td>
                    <td className={labelAr} dir="rtl">مكان الولادة</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Marital Status</td>
                    <td className={valueCell}>{candidate.personalInfo?.maritalStatus}</td>
                    <td className={labelAr} dir="rtl">الحالة الاجـتماعية</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>No. of Children</td>
                    <td className={valueCell}>{candidate.personalInfo?.numberOfChildren}</td>
                    <td className={labelAr} dir="rtl">عدد الأطفال</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Height</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : '—'}
                    </td>
                    <td className={labelAr} dir="rtl">الطول</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Weight</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : '—'}
                    </td>
                    <td className={labelAr} dir="rtl">الوزن</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Living Town</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.city || candidate.personalInfo?.address}
                    </td>
                    <td className={labelAr} dir="rtl">مـدـان السـكـن</td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Education;</td>
                    <td className={valueCell}>{candidate.personalInfo?.educationLevel || 'PRIMARY'}</td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={redLabel}>In case of<br />Emergency:</td>
                    <td className={valueCell}>
                      {candidate.personalInfo?.emergencyContactName}
                      {candidate.personalInfo?.emergencyContactPhone ? ` - ${candidate.personalInfo.emergencyContactPhone}` : ''}
                    </td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Salary:</td>
                    <td className={valueCell}>{candidate.personalInfo?.salary || '1000SR'}</td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={redLabel}>Address:</td>
                    <td className={valueCell}>
                      {[candidate.personalInfo?.address, candidate.personalInfo?.city].filter(Boolean).join(', ')}
                    </td>
                    <td className={labelAr} dir="rtl"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Full Body Photo */}
            <div className="ml-4 shrink-0" style={{ width: '160px' }}>
              <div className="border border-black bg-white flex items-center justify-center overflow-hidden" style={{ height: '400px', width: '160px' }}>
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} className="w-full h-full object-cover" alt="Full Body" />
                ) : (
                  <div className="text-xs text-gray-400 text-center">Full Body<br />Photo</div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════ PREVIOUS EMPLOYMENT ABROAD ═══════ */}
          <div className="mt-5">
            <div className="font-bold text-[16px] mb-1 underline">PREVIOUS EMPLOYMENT ABROAD</div>
            <table className="border-collapse" style={{ width: '72%' }}>
              <thead>
                <tr>
                  <td className={`${cell} w-[50%]`}>
                    <span className="text-red-700">Country</span>
                    <span dir="rtl" className="float-right font-bold">الـبـــلـد</span>
                  </td>
                  <td className={`${cell} w-[50%]`}>
                    <span className="text-red-700">Period</span>
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
          <div className="mt-5 flex gap-6">
            <div style={{ width: '50%' }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${cell} text-left w-[33%]`}>ENGLISH</th>
                    <th className={`${cell} text-center w-[34%]`}></th>
                    <th className={`${cell} text-right w-[33%]`} dir="rtl">اللـغــة الـعـربـيـة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${cell} text-red-700`}>Fair</td>
                    <td className={`${cell} text-center`}>{!experienced ? '✓' : ''}</td>
                    <td className={`${cell} text-right`} dir="rtl">وسـط</td>
                  </tr>
                  <tr>
                    <td className={`${cell} text-red-700`}>Good</td>
                    <td className={`${cell} text-center`}>{experienced ? '✓' : ''}</td>
                    <td className={`${cell} text-right`} dir="rtl">جـيـــد</td>
                  </tr>
                  <tr>
                    <td className={`${cell} text-red-700`}>Fluent</td>
                    <td className={`${cell} text-center`}></td>
                    <td className={`${cell} text-right`} dir="rtl">ممـتـاز</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Remarks */}
            <div style={{ width: '45%' }}>
              <div className="font-bold text-[16px] mb-2">REMARKS:──────────────</div>
              <div className="border-b border-black mb-3 w-full">&nbsp;</div>
              <div className="border-b border-black mb-3 w-full">&nbsp;</div>
              <div className="border-b border-black mb-3 w-full">&nbsp;</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ PAGE 2 — Passport ═══════════════ */}
      <PassportPage candidate={candidate} />
    </div>
  );
}
