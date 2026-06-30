'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';
import CVTemplateRenderer from '@/components/cv/CVTemplateRenderer';
import { normalizeTemplateId } from '@/lib/cv-templates';

export default function CVPrintPage({ params }: { params: Promise<{ id: string; template: string }> }) {
  const { id, template } = use(params);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api(`/api/candidates/${id}`);
        const data = await res.json();
        setCandidate(data);
      } catch (err) {
        console.error('Failed to fetch candidate:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-10">Loading template...</div>;
  if (!candidate) return <div className="p-10">Candidate not found</div>;

  const facePhoto = getFileUrl(candidate.facePhotoUrl || candidate.passportImageUrl);
  const fullBodyPhoto = getFileUrl(candidate.fullBodyPhotoUrl);

  return (
    <div className="bg-white min-h-screen">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
        }
        #cv-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          box-shadow: none !important;
        }
      `}</style>
      <div id="cv-container">
        <CVTemplateRenderer
          templateId={normalizeTemplateId(template)}
          candidate={{
            ...candidate,
            passportImageUrl: getFileUrl(candidate.passportImageUrl),
            facePhotoUrl: getFileUrl(candidate.facePhotoUrl),
            fullBodyPhotoUrl: getFileUrl(candidate.fullBodyPhotoUrl),
          }}
          facePhoto={facePhoto}
          fullBodyPhoto={fullBodyPhoto}
        />
      </div>
    </div>
  );
}
