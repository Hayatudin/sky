import { Router, Request, Response } from 'express';
import { db } from '../db';
import { broker, candidate, generatedCV } from '../db/schema';
import { eq, and, not, desc, inArray, sql } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';

const router = Router();

const formatCandidate = (c: any) => {
  if (!c) return null;
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };
  return {
    id: c.id,
    shelfId: c.shelfId,
    cvDeadline: formatDate(c.cvDeadline),
    passportData: {
      passportNumber: c.passportNumber,
      surname: c.surname,
      givenNames: c.givenNames,
      dateOfBirth: formatDate(c.dateOfBirth),
      gender: c.gender,
      nationality: c.nationality,
      issuingCountry: c.issuingCountry,
      dateOfIssue: formatDate(c.dateOfIssue),
      dateOfExpiry: formatDate(c.dateOfExpiry),
      placeOfBirth: c.placeOfBirth,
    },
    personalInfo: {
      idNumber: c.idNumber || c.passportNumber,
      job: c.job || '',
      maritalStatus: c.maritalStatus,
      numberOfChildren: c.numberOfChildren,
      religion: c.religion,
      bloodType: c.bloodType,
      height: c.height,
      weight: c.weight,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      educationLevel: c.educationLevel,
      languages: c.languages,
      workExperience: c.workExperience || [],
      skills: c.skills,
      medicalStatus: c.medicalStatus,
      biometricStatus: c.biometricStatus,
      medicalDate: formatDate(c.medicalDate),
      biometricDate: formatDate(c.biometricDate),
      knownConditions: c.knownConditions,
      emergencyContactName: c.emergencyContactName,
      emergencyContactRelation: c.emergencyContactRelation,
      emergencyContactPhone: c.emergencyContactPhone,
      emergencyContactAddress: c.emergencyContactAddress,
      additionalPhones: c.additionalPhones,
      brokerId: c.brokerId || '',
      cocDocumentUrl: c.cocDocumentUrl || '',
      medicalDocumentUrl: c.medicalDocumentUrl || '',
      candidateIdImageUrl: c.candidateIdImageUrl || '',
      relativeIdImageUrl: c.relativeIdImageUrl || '',
      labourIdUrl: c.labourIdUrl || '',
      salary: c.salary || '1000SR',
    },
    brokerId: c.brokerId,
    broker: c.broker,
    passportImageUrl: c.passportImageUrl || '',
    facePhotoUrl: c.facePhotoUrl || '',
    fullBodyPhotoUrl: c.fullBodyPhotoUrl || '',
    cocDocumentUrl: c.cocDocumentUrl || '',
    medicalDocumentUrl: c.medicalDocumentUrl || '',
    candidateIdImageUrl: c.candidateIdImageUrl || '',
    relativeIdImageUrl: c.relativeIdImageUrl || '',
    labourIdUrl: c.labourIdUrl || '',
    isRequested: c.isRequested || false,
    visaOrContractNumber: c.visaOrContractNumber || null,
    isFlagged: c.isFlagged || false,
    videoUrl: c.videoUrl || null,
    registeredAt: c.registeredAt instanceof Date ? c.registeredAt.toISOString() : c.registeredAt,
    status: c.status,
    visaSelected: c.visaSelected,
    visaDate: c.visaDate ? (c.visaDate instanceof Date ? c.visaDate.toISOString() : c.visaDate) : null,
    salary: c.salary || '1000SR',
    cvDownloaded: c.cvDownloaded || false,
  };
};

async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const rows = await db.select({ id: broker.id, isLocked: broker.isLocked }).from(broker);
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked;
    }
    return map;
  } catch (e) {
    console.warn('[GENERATED-CVS] Could not fetch isLocked column:', e);
    return {};
  }
}

// GET /api/generated-cvs
router.get('/', async (req: Request, res: Response) => {
  try {
    // MySQL 5.7 compatible — no lateral joins
    const generatedCVsList = await db.select().from(generatedCV)
      .orderBy(desc(generatedCV.createdAt));

    if (generatedCVsList.length === 0) {
      return res.json([]);
    }

    const candidateIds = [...new Set(generatedCVsList.map(cv => cv.candidateId))];
    const candidates = candidateIds.length > 0
      ? await db.select().from(candidate).where(inArray(candidate.id, candidateIds))
      : [];

    const brokerIds = [...new Set(candidates.map((c: any) => c.brokerId).filter(Boolean))] as string[];
    const brokers = brokerIds.length > 0
      ? await db.select().from(broker).where(inArray(broker.id, brokerIds))
      : [];
    const brokerMap = new Map(brokers.map(b => [b.id, b]));
    const candidateMap = new Map(candidates.map(c => ({
      ...c,
      broker: c.brokerId ? (brokerMap.get(c.brokerId) || null) : null
    })).map(c => [c.id, c]));

    const lockMap = await getBrokerLockMap();

    const mappedCVs = generatedCVsList.map((cv: any) => {
      const cand = candidateMap.get(cv.candidateId);
      const formattedCandidateObj = formatCandidate(cand);
      if (formattedCandidateObj) {
        formattedCandidateObj.cvDownloaded = cand?.cvDownloaded ?? false;
        if (formattedCandidateObj.broker) {
          formattedCandidateObj.broker.isLocked = lockMap[formattedCandidateObj.broker.id] ?? false;
        }
      }
      return { ...cv, candidate: formattedCandidateObj };
    });

    res.json(mappedCVs);
  } catch (error: any) {
    console.error('Error fetching generated CVs:', error);
    res.status(500).json({ error: 'Failed to fetch generated CVs', message: error?.message });
  }
});

// POST /api/generated-cvs
router.post('/', async (req: Request, res: Response) => {
  try {
    const { candidateId, templateId, facePhotoUrl, fullBodyPhotoUrl } = req.body;
    
    if (!candidateId || !templateId) {
      return res.status(400).json({ error: 'Missing candidateId or templateId' });
    }
    
    const cand = await db.query.candidate.findFirst({
      where: eq(candidate.id, candidateId)
    });
    
    if (!cand) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const duplicateCV = await db.query.generatedCV.findFirst({
      where: eq(generatedCV.candidateId, candidateId)
    });

    if (duplicateCV) {
      return res.status(409).json({ 
        error: 'Candidate already generated', 
        templateId: duplicateCV.templateId 
      });
    }
    
    const [faceUrl, fullBodyUrl] = await Promise.all([
      uploadToLocal(facePhotoUrl, 'faces'),
      uploadToLocal(fullBodyPhotoUrl, 'fullbody')
    ]);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const cleanTemplateId = templateId.replace('tmpl-', '').toLowerCase();
    
    const cvRecord = await db.transaction(async (tx) => {
      await tx.insert(generatedCV).values({
        candidateId,
        templateId,
        facePhotoUrl: faceUrl,
        fullBodyPhotoUrl: fullBodyUrl
      });
      
      await tx.update(candidate)
        .set({ 
          cvDeadline: deadline,
          agency: cleanTemplateId
        })
        .where(eq(candidate.id, candidateId));

      return await tx.query.generatedCV.findFirst({
        where: eq(generatedCV.candidateId, candidateId)
      });
    });
    
    res.json(cvRecord);
  } catch (error) {
    console.error('Error saving generated CV:', error);
    res.status(500).json({ error: 'Failed to save generated CV' });
  }
});

// PATCH /api/generated-cvs/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Missing templateId' });
    }
    
    const existingCV = await db.query.generatedCV.findFirst({
      where: eq(generatedCV.id, id)
    });
    
    if (!existingCV) {
      return res.status(404).json({ error: 'Generated CV not found' });
    }

    const duplicateCV = await db.query.generatedCV.findFirst({
      where: and(
        eq(generatedCV.candidateId, existingCV.candidateId),
        eq(generatedCV.templateId, templateId),
        not(eq(generatedCV.id, id))
      )
    });

    if (duplicateCV) {
      return res.status(409).json({ error: 'Candidate already generated in that template' });
    }

    const cleanTemplateId = templateId.replace('tmpl-', '').toLowerCase();
    
    const updatedCV = await db.transaction(async (tx) => {
      await tx.update(generatedCV)
        .set({ templateId })
        .where(eq(generatedCV.id, id));

      await tx.update(candidate)
        .set({ 
          cvDownloaded: false, 
          agency: cleanTemplateId 
        })
        .where(eq(candidate.id, existingCV.candidateId));

      return await tx.query.generatedCV.findFirst({
        where: eq(generatedCV.id, id)
      });
    });
    
    res.json(updatedCV);
  } catch (error) {
    console.error('Error updating generated CV:', error);
    res.status(500).json({ error: 'Failed to update generated CV' });
  }
});

// DELETE /api/generated-cvs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingCV = await db.query.generatedCV.findFirst({
      where: eq(generatedCV.id, id)
    });
    
    if (!existingCV) {
      return res.status(404).json({ error: 'Generated CV not found' });
    }

    await db.delete(generatedCV).where(eq(generatedCV.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generated CV:', error);
    res.status(500).json({ error: 'Failed to delete generated CV' });
  }
});

export default router;
