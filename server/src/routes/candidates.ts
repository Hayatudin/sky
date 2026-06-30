import { Router, Request, Response } from 'express';
import { db } from '../db';
import { candidate, broker, generatedCV, invoice, notification, quickRegistration, user } from '../db/schema';
import { eq, inArray, and, or, like, sql, not, isNotNull } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';
import { encryptPath, sanitizeIncomingPath } from '../lib/crypto';
import { createId } from '@paralleldrive/cuid2';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const candidateBodySchema = z.object({
  passportData: z.object({
    passportNumber: z.string().optional().nullable(),
    surname: z.string().optional().nullable(),
    givenNames: z.string().optional().nullable(),
  }).partial().passthrough(),
  personalInfo: z.object({
    phone: z.string().optional().nullable(),
    job: z.string().optional().nullable(),
  }).partial().passthrough(),
}).partial().passthrough();

const router = Router();

async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const rows = await db.select({ id: broker.id, isLocked: broker.isLocked }).from(broker);
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked;
    }
    return map;
  } catch (e) {
    console.warn('[CANDIDATES] Could not fetch isLocked column:', e);
    return {};
  }
}

// GET /api/candidates
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';

    // Fetch all brokers and their lock status safely
    const lockMap = await getBrokerLockMap();
    const brokerMap = new Map<string, any>();
    try {
      const dbBrokers = await db.select({ id: broker.id, name: broker.name, isLocked: broker.isLocked }).from(broker);
      for (const b of dbBrokers) {
        brokerMap.set(b.id, {
          id: b.id,
          name: b.name,
          isLocked: lockMap[b.id] ?? b.isLocked ?? false
        });
      }
    } catch (err) {
      console.warn('Could not fetch brokers for candidates mapping:', err);
    }

    const dbCandidates = await db.query.candidate.findMany({
      orderBy: (c, { desc }) => [desc(c.registeredAt)],
      with: {
        generatedCVs: {
          orderBy: (gc, { desc }) => [desc(gc.createdAt)],
          columns: { id: true, templateId: true }
        },
        registeredBy: { columns: { name: true } },
        invoices: { columns: { isDelivered: true } }
      }
    });

    const userList = await db.select({ id: user.id, name: user.name }).from(user);
    const userMap = new Map<string, string>();
    userList.forEach(u => userMap.set(u.id, u.name));

    const candidates = dbCandidates.map((c: any) => {
      const formatDate = (date: Date | null | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      };

      const registeredByName = c.registeredById ? (userMap.get(c.registeredById) || c.registeredBy?.name || 'Admin') : 'Admin';

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
          cocDocumentUrl: encryptPath(c.cocDocumentUrl),
          medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
          candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
          relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
          labourIdUrl: encryptPath(c.labourIdUrl),
          salary: c.salary || '1000SR',
        },
        brokerId: c.brokerId,
        broker: c.brokerId ? (brokerMap.get(c.brokerId) || null) : null,
        passportImageUrl: encryptPath(c.passportImageUrl),
        facePhotoUrl: encryptPath(c.facePhotoUrl),
        fullBodyPhotoUrl: encryptPath(c.fullBodyPhotoUrl),
        cocDocumentUrl: encryptPath(c.cocDocumentUrl),
        medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
        candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
        relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
        labourIdUrl: encryptPath(c.labourIdUrl),
        isRequested: c.isRequested || false,
        visaOrContractNumber: c.visaOrContractNumber || null,
        isFlagged: c.isFlagged || false,
        isLocked: c.isLocked ?? false,
        cvDownloaded: c.cvDownloaded ?? false,
        videoUrl: encryptPath(c.videoUrl),
        Youtube_URL: c.videoUrl, // Maps to Youtube_URL in schema.ts
        deployedDate: c.deployedDate ? c.deployedDate.toISOString() : null,
        registeredAt: c.registeredAt instanceof Date ? c.registeredAt.toISOString() : c.registeredAt,
        status: c.status,
        visaSelected: c.visaSelected,
        visaDate: c.visaDate ? c.visaDate.toISOString() : null,
        salary: c.salary || '1000SR',
        price: isSuperAdmin ? (c.price ?? null) : null,
        generatedCVs: c.generatedCVs?.map((cv: any) => ({ id: cv.id, templateId: cv.templateId })) || [],
        latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
        registeredBy: registeredByName,
        hasInvoice: c.invoices && c.invoices.length > 0,
        isInvoiceDelivered: c.invoices?.some((i: any) => i.isDelivered) || false,
        agency: c.agency || 'daera',
        allowVideo: c.allowVideo ?? false,
      };
    });

    res.json(candidates);
  } catch (error: any) {
    console.error('Failed to fetch candidates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch candidates', 
      message: error?.message || String(error)
    });
  }
});

// POST /api/candidates/promote-from-quick
router.post('/promote-from-quick', async (req: Request, res: Response) => {
  try {
    const { quickRegistrationId } = req.body;
    if (!quickRegistrationId) {
      return res.status(400).json({ error: 'quickRegistrationId is required' });
    }

    const qr = await db.query.quickRegistration.findFirst({
      where: eq(quickRegistration.id, quickRegistrationId)
    });
    if (!qr) {
      return res.status(404).json({ error: 'Quick registration not found' });
    }

    const passportUpper = (qr.passportNumber || '').trim().toUpperCase();
    const targetCandidate = await db.query.candidate.findFirst({
      where: (c, { eq }) => eq(sql`upper(${c.passportNumber})`, passportUpper)
    });

    if (!targetCandidate) {
      return res.status(404).json({ error: `No candidate found with passport number ${qr.passportNumber}. Please complete full registration first.` });
    }

    const updateData: any = {
      allowVideo: qr.allowVideo
    };

    if (qr.cocDocumentUrl) updateData.cocDocumentUrl = qr.cocDocumentUrl;
    if (qr.labourIdUrl) updateData.labourIdUrl = qr.labourIdUrl;
    if (qr.candidateIdImageUrl) updateData.candidateIdImageUrl = qr.candidateIdImageUrl;
    if (qr.relativeIdImageUrl) updateData.relativeIdImageUrl = qr.relativeIdImageUrl;
    
    let hasRemoteVideo = false;
    if (qr.videoUrl) {
      if (qr.videoUrl.startsWith('http')) {
        updateData.videoUrl = qr.videoUrl;
        hasRemoteVideo = true;
      } else {
        updateData.quickVideoUrl = qr.videoUrl;
      }
    }

    if (qr.agency) {
      updateData.agency = qr.agency;
    }

    await db.update(candidate)
      .set(updateData)
      .where(eq(candidate.id, targetCandidate.id));

    // Mark QR as promoted
    await db.update(quickRegistration)
      .set({
        promotedAt: new Date(),
        promotedCandidateId: targetCandidate.id,
        verificationStatus: 'promoted'
      })
      .where(eq(quickRegistration.id, quickRegistrationId));

    res.json({
      success: true,
      candidateId: targetCandidate.id,
      message: `Documents successfully pushed to candidate ${targetCandidate.passportNumber}`,
    });
  } catch (error: any) {
    console.error('Failed to promote quick registration:', error);
    res.status(500).json({ error: error?.message || 'Failed to promote quick registration' });
  }
});

// POST /api/candidates
router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = candidateBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid candidate registration data structure', details: parseResult.error.format() });
    }
    const body = parseResult.data as any;

    // Resolve logged in user from session to populate registeredById
    let registeredById = body.registeredById || null;
    let userRole = null;
    console.log('[DEBUG] POST /candidates - body.registeredById:', body.registeredById);

    try {
      const session = await getSession(req);
      if (session?.user?.id) {
        registeredById = session.user.id;
        userRole = (session?.user as any)?.role;
        console.log('[DEBUG] Resolved registeredById from server session:', registeredById, 'User Name:', session.user.name);
      }
    } catch (sessionError) {
      console.error('[DEBUG] Failed to get session in POST candidate route:', sessionError);
    }

    const [
      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl,
      videoUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id'),
      uploadToLocal(body.videoUrl, 'videos')
    ]);

    const counterFilePath = path.join(process.cwd(), 'shelf_counter.json');
    let currentCounter = 0;

    if (fs.existsSync(counterFilePath)) {
      try {
        const fileData = fs.readFileSync(counterFilePath, 'utf8');
        const parsed = JSON.parse(fileData);
        if (typeof parsed.counter === 'number') {
          currentCounter = parsed.counter;
        }
      } catch (e) {
        console.error("Error reading shelf_counter.json:", e);
      }
    }

    if (currentCounter === 0) {
      const lastCand = await db.query.candidate.findFirst({
        where: isNotNull(candidate.shelfId),
        orderBy: (c, { desc }) => [desc(c.shelfId)]
      });
      if (lastCand && lastCand.shelfId) {
        const parsed = parseInt(lastCand.shelfId, 10);
        if (!isNaN(parsed)) {
          currentCounter = parsed;
        }
      }
    }

    const nextNum = currentCounter + 1;

    try {
      fs.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), 'utf8');
    } catch (e) {
      console.error("Error writing shelf_counter.json:", e);
    }

    const nextShelfId = body.shelfId || String(nextNum).padStart(3, '0');



    let finalBrokerId = body.personalInfo?.brokerId;
    if (userRole === 'calling' || body.personalInfo?.brokerId === 'calling-broker' || body.isCalling) {
      try {
        let callingBroker = await db.query.broker.findFirst({
          where: eq(broker.name, 'Calling')
        });
        if (!callingBroker) {
          const newBrokerId = createId();
          await db.insert(broker).values({
            id: newBrokerId,
            name: 'Calling'
          });
          callingBroker = { id: newBrokerId, name: 'Calling', isLocked: false, createdAt: new Date(), leaderId: null };
        }
        finalBrokerId = callingBroker.id;
      } catch (brokerErr) {
        console.error('Failed to resolve or create Calling broker:', brokerErr);
      }
    }

    const generatedId = createId();

    const candidateValues: any = {
      id: generatedId,
      shelfId: nextShelfId,
      passportNumber: body.passportData.passportNumber,
      surname: body.passportData.surname,
      givenNames: body.passportData.givenNames,
      dateOfBirth: body.passportData.dateOfBirth ? new Date(body.passportData.dateOfBirth) : new Date(),
      gender: body.passportData.gender,
      nationality: body.passportData.nationality,
      issuingCountry: body.passportData.issuingCountry,
      dateOfIssue: body.passportData.dateOfIssue ? new Date(body.passportData.dateOfIssue) : new Date(),
      dateOfExpiry: body.passportData.dateOfExpiry ? new Date(body.passportData.dateOfExpiry) : new Date(),
      placeOfBirth: body.passportData.placeOfBirth,

      idNumber: body.personalInfo.idNumber,
      job: body.personalInfo.job,
      maritalStatus: body.personalInfo.maritalStatus,
      numberOfChildren: body.personalInfo.numberOfChildren || 0,
      religion: body.personalInfo.religion,
      bloodType: body.personalInfo.bloodType,
      height: body.personalInfo.height,
      weight: body.personalInfo.weight,
      phone: body.personalInfo.phone,
      email: body.personalInfo.email,
      address: body.personalInfo.address,
      city: body.personalInfo.city,
      state: body.personalInfo.state,
      country: body.personalInfo.country,
      educationLevel: body.personalInfo.educationLevel,
      languages: body.personalInfo.languages,
      workExperience: body.personalInfo.workExperience,
      skills: body.personalInfo.skills,
      medicalStatus: body.personalInfo.medicalStatus || 'Pending',
      biometricStatus: body.personalInfo.biometricStatus || 'Pending',
      medicalDate: body.personalInfo.medicalDate ? new Date(body.personalInfo.medicalDate) : null,
      biometricDate: body.personalInfo.biometricDate ? new Date(body.personalInfo.biometricDate) : null,
      knownConditions: body.personalInfo.knownConditions,
      emergencyContactName: body.personalInfo.emergencyContactName,
      emergencyContactRelation: body.personalInfo.emergencyContactRelation,
      emergencyContactPhone: body.personalInfo.emergencyContactPhone,
      emergencyContactAddress: body.personalInfo.emergencyContactAddress,
      additionalPhones: body.personalInfo.additionalPhones || [],
      brokerId: finalBrokerId || null,

      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl,
      videoUrl: videoUrl || null,
      quickVideoUrl: videoUrl && !videoUrl.startsWith('http') ? videoUrl : null,
      status: body.status || 'pending',
      agency: body.agency || 'daera',
      salary: body.personalInfo?.salary || '1000SR',
      allowVideo: body.allowVideo ? true : false,
      registeredById,
      price: body.price || null
    };

    await db.insert(candidate).values(candidateValues);

    const createdCandidate = await db.query.candidate.findFirst({
      where: eq(candidate.id, generatedId)
    });

    if (!createdCandidate) {
      throw new Error('Failed to retrieve candidate after creation');
    }

    // Automatically create a GeneratedCV record for Calling candidates with the selected Office
    if (userRole === 'calling' || body.personalInfo?.brokerId === 'calling-broker' || body.isCalling) {
      const templateId = body.office || body.templateId || body.agency || '';
      const validTemplates = ['rawasi', 'azm', 'mazaya'];
      if (validTemplates.includes(templateId.toLowerCase())) {
        try {
          const existingCV = await db.query.generatedCV.findFirst({
            where: and(
              eq(generatedCV.candidateId, createdCandidate.id),
              eq(generatedCV.templateId, templateId.toLowerCase())
            )
          });
          if (!existingCV) {
            await db.insert(generatedCV).values({
              candidateId: createdCandidate.id,
              templateId: templateId.toLowerCase(),
              facePhotoUrl: facePhotoUrl || null,
              fullBodyPhotoUrl: null
            });
            // Also update cvDeadline
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 30);
            await db.update(candidate)
              .set({ cvDeadline: deadline })
              .where(eq(candidate.id, createdCandidate.id));
            console.log(`[AUTO-CV] Created initial GeneratedCV for Calling candidate ${createdCandidate.id} using template: ${templateId}`);
          }
        } catch (cvErr) {
          console.error('[AUTO-CV] Failed to create initial GeneratedCV for calling candidate:', cvErr);
        }
      }
    }

    // If quickRegistrationId is provided, mark it as promoted
    if (body.quickRegistrationId) {
      try {
        const qrRecord = await db.query.quickRegistration.findFirst({
          where: eq(quickRegistration.id, body.quickRegistrationId)
        });
        if (qrRecord) {
          await db.update(candidate)
            .set({ allowVideo: qrRecord.allowVideo })
            .where(eq(candidate.id, createdCandidate.id));
        }

        await db.update(quickRegistration)
          .set({
            promotedAt: new Date(),
            promotedCandidateId: createdCandidate.id,
            verificationStatus: 'promoted'
          })
          .where(eq(quickRegistration.id, body.quickRegistrationId));
      } catch (promotionError) {
        console.error(`[DEBUG] Failed to update QuickRegistration promotion:`, promotionError);
      }
    }

    res.status(201).json(createdCandidate);
  } catch (error: any) {
    console.error('Failed to create candidate:', error);
    if (error.message?.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists in the system.' });
    }
    res.status(500).json({ error: error.message || String(error) });
  }
});

// GET /api/candidates/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req: Request, res: Response) => {
  try {
    const { passportNumber } = req.params;
    const passportUpper = passportNumber.trim().toUpperCase();

    const cand = await db.query.candidate.findFirst({
      where: (c, { eq }) => eq(sql`upper(${c.passportNumber})`, passportUpper),
      columns: { givenNames: true, surname: true }
    });

    if (!cand) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      fullName: `${cand.surname} ${cand.givenNames}`.trim()
    });
  } catch (err: any) {
    console.error('Failed to lookup candidate by passport:', err);
    res.status(500).json({ error: 'Failed to look up candidate: ' + err.message });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';
    const { id } = req.params;

    const c = await db.query.candidate.findFirst({
      where: eq(candidate.id, id),
      with: {
        broker: true,
        generatedCVs: {
          orderBy: (gc, { desc }) => [desc(gc.createdAt)],
          limit: 1
        },
        registeredBy: { columns: { name: true } }
      }
    });

    if (!c) return res.status(404).json({ error: 'Not found' });

    // Look up the linked QuickRegistration by passport number to use as a
    // fallback video source when the Candidate's own quickVideoUrl is null.
    const passportUpper = (c.passportNumber || '').trim().toUpperCase();
    const linkedQr = await db.query.quickRegistration.findFirst({
      where: (qr, { and, isNotNull }) =>
        and(
          isNotNull(qr.videoUrl),
          eq(sql`upper(${qr.passportNumber})`, passportUpper)
        ),
      columns: { videoUrl: true }
    });
    const entryVideoUrl = linkedQr?.videoUrl ?? null;

    const formatted = {
      id: c.id,
      shelfId: c.shelfId,
      cvDeadline: c.cvDeadline?.toISOString().split('T')[0],
      passportData: {
        passportNumber: c.passportNumber,
        surname: c.surname,
        givenNames: c.givenNames,
        dateOfBirth: c.dateOfBirth.toISOString().split('T')[0],
        gender: c.gender,
        nationality: c.nationality,
        issuingCountry: c.issuingCountry,
        dateOfIssue: c.dateOfIssue.toISOString().split('T')[0],
        dateOfExpiry: c.dateOfExpiry.toISOString().split('T')[0],
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
        workExperience: c.workExperience ? (c.workExperience as any) : [],
        skills: c.skills,
        medicalStatus: c.medicalStatus,
        biometricStatus: c.biometricStatus,
        medicalDate: c.medicalDate?.toISOString().split('T')[0],
        biometricDate: c.biometricDate?.toISOString().split('T')[0],
        knownConditions: c.knownConditions,
        emergencyContactName: c.emergencyContactName,
        emergencyContactRelation: c.emergencyContactRelation,
        emergencyContactPhone: c.emergencyContactPhone,
        emergencyContactAddress: c.emergencyContactAddress,
        additionalPhones: c.additionalPhones,
        brokerId: c.brokerId || '',
        cocDocumentUrl: encryptPath(c.cocDocumentUrl),
        medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
        candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
        relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
        labourIdUrl: encryptPath(c.labourIdUrl),
        salary: c.salary || '1000SR',
      },
      passportImageUrl: encryptPath(c.passportImageUrl),
      facePhotoUrl: encryptPath(c.facePhotoUrl),
      fullBodyPhotoUrl: encryptPath(c.fullBodyPhotoUrl),
      cocDocumentUrl: encryptPath(c.cocDocumentUrl),
      medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
      candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
      relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
      labourIdUrl: encryptPath(c.labourIdUrl),
      status: c.status,
      isRequested: c.isRequested,
      visaOrContractNumber: c.visaOrContractNumber || null,
      videoUrl: encryptPath(c.videoUrl),
      Youtube_URL: c.videoUrl,
      // Fall back to the Entry video if the candidate's own quickVideoUrl is absent
      quickVideoUrl: encryptPath(c.quickVideoUrl ?? entryVideoUrl),
      deployedDate: c.deployedDate ? c.deployedDate.toISOString() : null,
      registeredAt: c.registeredAt.toISOString(),
      broker: c.broker,
      visaSelected: c.visaSelected,
      visaDate: c.visaDate ? c.visaDate.toISOString() : null,
      salary: c.salary || '1000SR',
      isLocked: c.isLocked ?? false,
      cvDownloaded: c.cvDownloaded ?? false,
      latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
      registeredBy: c.registeredBy?.name || 'Admin',
      agency: c.agency || 'daera',
      allowVideo: c.allowVideo ?? false,
      price: isSuperAdmin ? c.price : null,
    };
    res.json(formatted);
  } catch (error) {
    console.error('Failed to get candidate:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// PUT /api/candidates/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = candidateBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid candidate update data structure', details: parseResult.error.format() });
    }
    const body = parseResult.data as any;
    
    const priceVal = body.price;
    delete body.price;
    if (body.personalInfo) {
      delete body.personalInfo.price;
    }

    // Resolve logged in user from session to populate registeredById
    let registeredById = body.registeredById || null;
    console.log('[DEBUG] PUT /candidates/:id - body.registeredById:', body.registeredById);

    try {
      const session = await getSession(req);
      if (session?.user?.id) {
        registeredById = session.user.id;
        console.log('[DEBUG] Resolved registeredById from server session in PUT:', registeredById);
      }
    } catch (sessionError) {
      console.error('[DEBUG] Failed to get session in PUT candidate route:', sessionError);
    }

    const [
      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl,
      videoUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id'),
      uploadToLocal(body.videoUrl, 'videos')
    ]);

    const existingCandidate = await db.query.candidate.findFirst({ where: eq(candidate.id, id) });
    if (!existingCandidate) return res.status(404).json({ error: 'Candidate not found' });

    let visaDateVal = existingCandidate.visaDate;
    if (body.visaSelected) {
      visaDateVal = existingCandidate.visaDate || new Date();
    } else if (body.visaSelected === false) {
      visaDateVal = null;
    }

    const updateData: any = {
      passportNumber: body.passportData.passportNumber,
      surname: body.passportData.surname,
      givenNames: body.passportData.givenNames,
      dateOfBirth: body.passportData.dateOfBirth ? new Date(body.passportData.dateOfBirth) : new Date(),
      gender: body.passportData.gender,
      nationality: body.passportData.nationality,
      issuingCountry: body.passportData.issuingCountry,
      dateOfIssue: body.passportData.dateOfIssue ? new Date(body.passportData.dateOfIssue) : new Date(),
      dateOfExpiry: body.passportData.dateOfExpiry ? new Date(body.passportData.dateOfExpiry) : new Date(),
      placeOfBirth: body.passportData.placeOfBirth,

      idNumber: body.personalInfo.idNumber,
      job: body.personalInfo.job,
      maritalStatus: body.personalInfo.maritalStatus,
      numberOfChildren: body.personalInfo.numberOfChildren || 0,
      religion: body.personalInfo.religion,
      bloodType: body.personalInfo.bloodType,
      height: body.personalInfo.height,
      weight: body.personalInfo.weight,
      phone: body.personalInfo.phone,
      email: body.personalInfo.email,
      address: body.personalInfo.address,
      city: body.personalInfo.city,
      state: body.personalInfo.state,
      country: body.personalInfo.country,
      educationLevel: body.personalInfo.educationLevel,
      languages: body.personalInfo.languages,
      workExperience: body.personalInfo.workExperience,
      skills: body.personalInfo.skills,
      medicalStatus: body.personalInfo.medicalStatus,
      biometricStatus: body.personalInfo.biometricStatus,
      medicalDate: body.personalInfo.medicalDate ? new Date(body.personalInfo.medicalDate) : null,
      biometricDate: body.personalInfo.biometricDate ? new Date(body.personalInfo.biometricDate) : null,
      knownConditions: body.personalInfo.knownConditions,
      emergencyContactName: body.personalInfo.emergencyContactName,
      emergencyContactRelation: body.personalInfo.emergencyContactRelation,
      emergencyContactPhone: body.personalInfo.emergencyContactPhone,
      emergencyContactAddress: body.personalInfo.emergencyContactAddress,
      additionalPhones: body.personalInfo.additionalPhones || [],
      brokerId: body.personalInfo.brokerId || null,

      status: body.status,
      isRequested: body.isRequested,
      visaSelected: body.visaSelected,
      agency: body.agency,
      visaDate: visaDateVal,
      salary: body.personalInfo?.salary || '1000SR',
      allowVideo: body.allowVideo ? true : false,
      price: priceVal !== undefined ? priceVal : existingCandidate.price
    };

    if (passportImageUrl) updateData.passportImageUrl = passportImageUrl;
    if (facePhotoUrl) updateData.facePhotoUrl = facePhotoUrl;
    if (fullBodyPhotoUrl) updateData.fullBodyPhotoUrl = fullBodyPhotoUrl;
    if (cocDocumentUrl) updateData.cocDocumentUrl = cocDocumentUrl;
    if (medicalDocumentUrl) updateData.medicalDocumentUrl = medicalDocumentUrl;
    if (candidateIdImageUrl) updateData.candidateIdImageUrl = candidateIdImageUrl;
    if (relativeIdImageUrl) updateData.relativeIdImageUrl = relativeIdImageUrl;
    if (labourIdUrl) updateData.labourIdUrl = labourIdUrl;
    
    if (videoUrl) {
      if (videoUrl.startsWith('http')) {
        updateData.videoUrl = videoUrl;
      } else {
        updateData.quickVideoUrl = videoUrl;
      }
    }

    if (!existingCandidate.registeredById && registeredById) {
      updateData.registeredById = registeredById;
    }

    await db.update(candidate)
      .set(updateData)
      .where(eq(candidate.id, id));

    const updatedCandidate = await db.query.candidate.findFirst({
      where: eq(candidate.id, id)
    });

    res.json(updatedCandidate);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    if (error.message?.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists.' });
    }
    res.status(500).json({ error: error.message || String(error) });
  }
});

// PATCH /api/candidates/bulk-cv-downloaded
router.patch('/bulk-cv-downloaded', async (req: Request, res: Response) => {
  try {
    const { candidateIds, cvDownloaded } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'candidateIds must be a non-empty array' });
    }
    
    await db.update(candidate)
      .set({ cvDownloaded })
      .where(inArray(candidate.id, candidateIds));

    // If marked as downloaded, make sure GeneratedCV entries exist
    if (cvDownloaded) {
      for (const id of candidateIds) {
        try {
          const existing = await db.query.generatedCV.findFirst({
            where: eq(generatedCV.candidateId, id)
          });
          if (!existing) {
            const cand = await db.query.candidate.findFirst({
              where: eq(candidate.id, id)
            });
            if (cand) {
              await db.insert(generatedCV).values({
                candidateId: id,
                templateId: 'rawasi',
                facePhotoUrl: cand.facePhotoUrl || '',
                fullBodyPhotoUrl: cand.fullBodyPhotoUrl || ''
              });
            }
          }
        } catch (cvErr) {
          console.warn(`[BULK-CV] Failed to auto-create GeneratedCV for candidate ${id}:`, cvErr);
        }
      }
    }
    
    res.json({ success: true, updatedCount: candidateIds.length });
  } catch (error: any) {
    console.error('Failed to bulk update cvDownloaded:', error);
    res.status(500).json({ error: error?.message || 'Failed to bulk update cvDownloaded' });
  }
});

// PATCH /api/candidates/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    console.log(`[PATCH] /api/candidates/${id}`, body);

    if (body.medicalStatus === 'Unfit') {
      body.isRequested = true;
      // Delete CVs if they are UNFIT
      await db.delete(generatedCV).where(eq(generatedCV.candidateId, id));
    }

    if (body.isFlagged !== undefined) {
      body.isFlagged = Boolean(body.isFlagged);
    }

    // Process base64 files
    const docFields = [
      { key: 'passportImageUrl', dir: 'passports' },
      { key: 'facePhotoUrl', dir: 'faces' },
      { key: 'fullBodyPhotoUrl', dir: 'fullbody' },
      { key: 'cocDocumentUrl', dir: 'coc' },
      { key: 'medicalDocumentUrl', dir: 'medical' },
      { key: 'candidateIdImageUrl', dir: 'candidate-id' },
      { key: 'relativeIdImageUrl', dir: 'relative-id' },
      { key: 'labourIdUrl', dir: 'labour-id' }
    ];

    for (const field of docFields) {
      if (body[field.key]) {
        body[field.key] = sanitizeIncomingPath(body[field.key]);
        if (body[field.key].startsWith('data:')) {
          try {
            body[field.key] = await uploadToLocal(body[field.key], field.dir);
          } catch (uploadErr) {
            console.error(`Failed to upload ${field.key} in PATCH:`, uploadErr);
          }
        }
      }
    }

    let quickVideoUrlVal = body.quickVideoUrl;
    if (quickVideoUrlVal) {
      quickVideoUrlVal = sanitizeIncomingPath(quickVideoUrlVal);
      if (quickVideoUrlVal.startsWith('data:')) {
        try {
          quickVideoUrlVal = await uploadToLocal(quickVideoUrlVal, 'videos');
        } catch (uploadErr) {
          console.error(`Failed to upload quickVideoUrl in PATCH:`, uploadErr);
        }
      }
    }

    const existingCandidate = await db.query.candidate.findFirst({ where: eq(candidate.id, id) });
    if (!existingCandidate) return res.status(404).json({ error: 'Candidate not found' });

    let visaDateVal = body.visaDate;
    if (body.visaSelected !== undefined) {
      if (body.visaSelected) {
        visaDateVal = existingCandidate.visaDate || new Date();
      } else {
        visaDateVal = null;
      }
    }

    const updateData: any = {};
    const stringFields = [
      'shelfId', 'passportNumber', 'surname', 'givenNames', 'gender', 'nationality',
      'issuingCountry', 'placeOfBirth', 'idNumber', 'job', 'maritalStatus', 'religion',
      'bloodType', 'height', 'weight', 'phone', 'email', 'address', 'city', 'state',
      'country', 'educationLevel', 'medicalStatus', 'biometricStatus', 'knownConditions',
      'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
      'emergencyContactAddress', 'passportImageUrl', 'facePhotoUrl', 'fullBodyPhotoUrl',
      'cocDocumentUrl', 'medicalDocumentUrl', 'candidateIdImageUrl', 'relativeIdImageUrl',
      'labourIdUrl', 'status', 'agency', 'salary', 'price'
    ];

    stringFields.forEach(f => {
      if (body[f] !== undefined) updateData[f] = body[f];
    });

    const dateFields = ['dateOfBirth', 'dateOfIssue', 'dateOfExpiry', 'medicalDate', 'biometricDate', 'cvDeadline'];
    dateFields.forEach(f => {
      if (body[f] !== undefined) updateData[f] = body[f] ? new Date(body[f]) : null;
    });

    const jsonFields = ['languages', 'workExperience', 'skills', 'additionalPhones'];
    jsonFields.forEach(f => {
      if (body[f] !== undefined) updateData[f] = body[f];
    });

    const booleanFields = ['isRequested', 'isFlagged', 'visaSelected', 'isLocked', 'cvDownloaded', 'allowVideo'];
    booleanFields.forEach(f => {
      if (body[f] !== undefined) updateData[f] = Boolean(body[f]);
    });

    if (body.numberOfChildren !== undefined) updateData.numberOfChildren = parseInt(body.numberOfChildren) || 0;
    if (body.brokerId !== undefined) updateData.brokerId = body.brokerId || null;

    if (quickVideoUrlVal !== undefined) updateData.quickVideoUrl = quickVideoUrlVal;
    if (body.videoUrl !== undefined) updateData.videoUrl = sanitizeIncomingPath(body.videoUrl);
    if (visaDateVal !== undefined) updateData.visaDate = visaDateVal;
    
    if (body.deployedDate !== undefined) {
      updateData.deployedDate = body.deployedDate ? new Date(body.deployedDate) : null;
    }

    await db.update(candidate)
      .set(updateData)
      .where(eq(candidate.id, id));

    const updated = await db.query.candidate.findFirst({
      where: eq(candidate.id, id)
    });

    if (updated && (updateData.cvDownloaded === true)) {
      const existing = await db.query.generatedCV.findFirst({
        where: eq(generatedCV.candidateId, id)
      });
      if (!existing) {
        await db.insert(generatedCV).values({
          candidateId: id,
          templateId: 'rawasi',
          facePhotoUrl: updated.facePhotoUrl || '',
          fullBodyPhotoUrl: updated.fullBodyPhotoUrl || ''
        });
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// DELETE /api/candidates/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.transaction(async (tx) => {
      // 1. Delete generated CVs
      await tx.delete(generatedCV).where(eq(generatedCV.candidateId, id));

      // 2. Delete invoices
      await tx.delete(invoice).where(eq(invoice.candidateId, id));

      // 3. Delete notifications
      await tx.delete(notification).where(eq(notification.candidateId, id));

      // 4. Update QuickRegistration promotions
      await tx.update(quickRegistration)
        .set({ promotedCandidateId: null, verificationStatus: 'verified' })
        .where(eq(quickRegistration.promotedCandidateId, id));

      // 5. Delete the candidate
      await tx.delete(candidate).where(eq(candidate.id, id));
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete candidate:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete candidate' });
  }
});

export default router;
