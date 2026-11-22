import React from 'react';
import { Candidate } from '@/types';
import { getFileUrl } from '@/lib/utils';

interface PassportPageProps {
  candidate: Candidate;
  backgroundImage?: string;
  bgOpacity?: number;
}

export default function PassportPage({ candidate, backgroundImage, bgOpacity }: PassportPageProps) {
  return (
    <div
      className="w-[794px] h-[1123px] relative break-before-page bg-white flex flex-col overflow-hidden"
      style={{ paddingTop: '30px', paddingRight: '50px', paddingBottom: '50px', paddingLeft: '30px' }}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: bgOpacity ?? 0.7,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div>
          {candidate.passportImageUrl ? (
            <img
              src={getFileUrl(candidate.passportImageUrl)}
              alt="Passport"
              className="w-[680px] h-[490px] object-contain object-left-top"
            />
          ) : (
            <div className="text-gray-400 text-sm border border-dashed border-gray-200 w-[680px] h-[490px] flex items-center justify-center">
              Passport Image Not Available
            </div>
          )}
        </div>

        {candidate.videoUrl && (
          <div className="mt-auto w-full flex flex-col items-center gap-2 pb-[20px]">
            <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500 font-sans">
              Scan to Watch Introduction Video
            </p>
            <div className="w-28 h-28 bg-white p-1 shadow-md border border-gray-100 rounded">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(candidate.videoUrl)}`}
                alt="Video QR"
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
