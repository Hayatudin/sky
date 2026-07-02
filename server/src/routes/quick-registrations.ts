import { Router, Request, Response } from 'express';
import { db } from '../db';
import { quickRegistration, candidate, user, broker, passport } from '../db/schema';
import { eq, or, sql, inArray } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';
import { createId } from '@paralleldrive/cuid2';
import { getNextShelfNo } from './passports';

// ── Helper: fetch quickRegistration without lateral joins (MySQL 5.7 compatible) ──
async function fetchQR(id: string) {
  const [reg] = await db.select().from(quickRegistration).where(eq(quickRegistration.id, id)).limit(1);
  if (!reg) return null;
  return await enrichQR(reg);
}

async function enrichQR(reg: any) {
  let brokerData: any = null;
  let registeredByName = 'Walk-in';

  if (reg.brokerId) {
    const [b] = await db.select({ id: broker.id, name: broker.name })
      .from(broker).where(eq(broker.id, reg.brokerId)).limit(1);
    if (b) brokerData = b;
  }

  if (reg.registeredById) {
    const [u] = await db.select({ name: user.name })
      .from(user).where(eq(user.id, reg.registeredById)).limit(1);
    if (u) registeredByName = u.name;
  }

  return { ...reg, broker: brokerData, registeredBy: registeredByName };
}

async function enrichQRMany(regs: any[]) {
  if (regs.length === 0) return [];

  // Batch fetch brokers
  const brokerIds = [...new Set(regs.map(r => r.brokerId).filter(Boolean))];
  const brokerMap = new Map<string, { id: string; name: string }>();
  if (brokerIds.length > 0) {
    const brokers = await db.select({ id: broker.id, name: broker.name })
      .from(broker).where(inArray(broker.id, brokerIds));
    brokers.forEach(b => brokerMap.set(b.id, b));
  }

  // Batch fetch users
  const userIds = [...new Set(regs.map(r => r.registeredById).filter(Boolean))];
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const users = await db.select({ id: user.id, name: user.name })
      .from(user).where(inArray(user.id, userIds));
    users.forEach(u => userMap.set(u.id, u.name));
  }

  return regs.map(reg => ({
    ...reg,
    broker: reg.brokerId ? (brokerMap.get(reg.brokerId) || null) : null,
    registeredBy: reg.registeredById ? (userMap.get(reg.registeredById) || 'Walk-in') : 'Walk-in',
  }));
}

async function syncPassportFromQuickReg(tx: any, qr: {
  passportNumber: string;
  givenNames: string;
  surname: string;
  passportImageUrl?: string | null;
  passportType?: string | null;
}) {
  try {
    if (!qr.passportNumber) return;

    const cleanPassportNumber = qr.passportNumber.trim().toUpperCase();
    const cleanFullName = `${qr.givenNames || ''} ${qr.surname || ''}`.trim().toUpperCase();

    // Check if passport already exists in the Passport table within the transaction context
    const existingPassport = await tx.query.passport.findFirst({
      where: (p: any, { eq }: any) => eq(p.passportNumber, cleanPassportNumber)
    });

    if (qr.passportType === 'original') {
      if (!existingPassport) {
        // Automatically generate shelf location and register
        const shelfNo = await getNextShelfNo();
        const id = 'pp' + createId();
        await tx.insert(passport).values({
          id,
          shelfNo,
          fullName: cleanFullName,
          passportNumber: cleanPassportNumber,
          passportImageUrl: qr.passportImageUrl || null,
          status: 'Available',
        });
        console.log(`[PASSPORT-SYNC] Automatically registered original passport under shelf ${shelfNo}`);
      } else {
        // Update details if it exists
        await tx.update(passport)
          .set({
            fullName: cleanFullName,
            passportImageUrl: qr.passportImageUrl || null,
          })
          .where(eq(passport.id, existingPassport.id));
      }
    } else {
      // If it is NOT original, remove from Available list if exists
      if (existingPassport) {
        await tx.delete(passport).where(eq(passport.id, existingPassport.id));
        console.log(`[PASSPORT-SYNC] Removed passport ${cleanPassportNumber} from Available list because passportType is ${qr.passportType}`);
      }
    }
  } catch (err) {
    console.error('[PASSPORT-SYNC] Error during passport synchronization:', err);
    throw err; // Re-throw to allow transaction rollback
  }
}

const router = Router();

// GET /api/quick-registrations/generate-client
router.get('/generate-client', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting Prisma Client regeneration on server...\n\n');
  res.write('ℹ️ Note: COOLSTAFF is now migrated to Drizzle ORM. Drizzle is a runtime-only library and does not require an npx build-generator step!\n\n');
  res.write('✅ Drizzle schema is active and direct database mapping is running successfully.\n');
  res.end();
});

// GET /api/quick-registrations
router.get('/', async (req: Request, res: Response) => {
  try {
    const regs = await db.select().from(quickRegistration)
      .orderBy(sql`${quickRegistration.createdAt} DESC`);
    const mapped = await enrichQRMany(regs);
    res.json(mapped);
  } catch (error) {
    console.error('Failed to fetch quick registrations:', error);
    res.status(500).json({ error: 'Failed to fetch quick registrations' });
  }
});

// POST /api/quick-registrations
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.passportNumber) {
      return res.status(400).json({ error: 'Passport number is required' });
    }

    const passportUpper = body.passportNumber.trim().toUpperCase();

    // Check for duplicates in QuickRegistration
    const existingQr = await db.query.quickRegistration.findFirst({
      where: (qr, { eq }) => eq(sql`upper(${qr.passportNumber})`, passportUpper)
    });

    if (existingQr) {
      return res.status(400).json({ error: 'A quick registration with this passport number already exists.' });
    }

    // Check for duplicates in full Candidates
    const existingCandidate = await db.query.candidate.findFirst({
      where: (c, { eq }) => eq(sql`upper(${c.passportNumber})`, passportUpper)
    });

    if (existingCandidate) {
      return res.status(400).json({ error: 'A full candidate registration with this passport number already exists.' });
    }

    // Resolve logged in user from session to populate registeredById
    let registeredById = body.registeredById || null;
    try {
      const session = await getSession(req);
      if (session?.user?.id) {
        registeredById = session.user.id;
        console.log('[DEBUG] Resolved registeredById from server session in quick-reg:', registeredById);
      }
    } catch (sessionError) {
      console.error('[DEBUG] Failed to get session in POST quick-reg route:', sessionError);
    }

    const [
      passportImageUrl,
      cocDocumentUrl,
      labourIdUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      videoUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.cocDocumentUrl, 'coc'),
      uploadToLocal(body.labourIdUrl, 'labour-id'),
      uploadToLocal(body.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.videoUrl, 'videos'),
    ]);

    const generatedId = createId();
    let registration: any = null;

    await db.transaction(async (tx) => {
      await tx.insert(quickRegistration).values({
        id: generatedId,
        passportNumber: body.passportNumber || '',
        surname: body.surname || '',
        givenNames: body.givenNames || '',
        dateOfBirth: body.dateOfBirth || null,
        gender: body.gender || null,
        nationality: body.nationality || null,
        dateOfExpiry: body.dateOfExpiry || null,
        issuingCountry: body.issuingCountry || null,
        placeOfBirth: body.placeOfBirth || null,
        educationLevel: body.educationLevel || null,
        jobExperience: body.jobExperience || null,
        maritalStatus: body.maritalStatus || null,
        numberOfChildren: parseInt(body.numberOfChildren) || 0,
        passportImageUrl,
        religion: body.religion || null,
        brokerId: body.brokerId || null,
        cocDocumentUrl: cocDocumentUrl || null,
        labourIdUrl: labourIdUrl || null,
        candidateIdImageUrl: candidateIdImageUrl || null,
        relativeIdImageUrl: relativeIdImageUrl || null,
        relativePhones: body.relativePhones || null,
        videoUrl: videoUrl || null,
        agency: body.agency || 'Sky',
        passportType: body.passportType || 'original',
        languages: body.languages || null,
        allowVideo: body.allowVideo ? true : false,
        registeredById
      });

      const txReg = await tx.select().from(quickRegistration)
        .where(eq(quickRegistration.id, generatedId)).limit(1);

      if (!txReg[0]) {
        throw new Error('Failed to retrieve quick registration after insert inside transaction');
      }

      registration = txReg[0];

      // Sync to Available Passport table
      await syncPassportFromQuickReg(tx, {
        passportNumber: registration.passportNumber,
        givenNames: registration.givenNames,
        surname: registration.surname,
        passportImageUrl: registration.passportImageUrl,
        passportType: registration.passportType,
      });
    });

    const enriched = await enrichQR(registration);
    res.status(201).json(enriched);
  } catch (error: any) {
    console.error('Error creating quick registration:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// PUT /api/quick-registrations/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await db.query.quickRegistration.findFirst({
      where: eq(quickRegistration.id, id)
    });
    if (!existing) {
      return res.status(404).json({ error: 'Quick registration not found' });
    }

    const [
      passportImageUrl,
      cocDocumentUrl,
      labourIdUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      videoUrl
    ] = await Promise.all([
      body.passportImageUrl !== undefined ? uploadToLocal(body.passportImageUrl, 'passports') : undefined,
      body.cocDocumentUrl !== undefined ? uploadToLocal(body.cocDocumentUrl, 'coc') : undefined,
      body.labourIdUrl !== undefined ? uploadToLocal(body.labourIdUrl, 'labour-id') : undefined,
      body.candidateIdImageUrl !== undefined ? uploadToLocal(body.candidateIdImageUrl, 'candidate-id') : undefined,
      body.relativeIdImageUrl !== undefined ? uploadToLocal(body.relativeIdImageUrl, 'relative-id') : undefined,
      body.videoUrl !== undefined ? uploadToLocal(body.videoUrl, 'videos') : undefined,
    ]);

    const updateData: any = {};
    if (body.passportNumber !== undefined) updateData.passportNumber = body.passportNumber;
    if (body.surname !== undefined) updateData.surname = body.surname;
    if (body.givenNames !== undefined) updateData.givenNames = body.givenNames;
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.nationality !== undefined) updateData.nationality = body.nationality;
    if (body.dateOfExpiry !== undefined) updateData.dateOfExpiry = body.dateOfExpiry;
    if (body.issuingCountry !== undefined) updateData.issuingCountry = body.issuingCountry;
    if (body.placeOfBirth !== undefined) updateData.placeOfBirth = body.placeOfBirth;
    if (body.educationLevel !== undefined) updateData.educationLevel = body.educationLevel;
    if (body.jobExperience !== undefined) updateData.jobExperience = body.jobExperience;
    if (body.maritalStatus !== undefined) updateData.maritalStatus = body.maritalStatus;
    if (body.numberOfChildren !== undefined) updateData.numberOfChildren = parseInt(body.numberOfChildren) || 0;
    if (passportImageUrl !== undefined) updateData.passportImageUrl = passportImageUrl;
    if (body.religion !== undefined) updateData.religion = body.religion;
    if (body.brokerId !== undefined) updateData.brokerId = body.brokerId || null;
    
    if (cocDocumentUrl !== undefined) updateData.cocDocumentUrl = cocDocumentUrl;
    if (labourIdUrl !== undefined) updateData.labourIdUrl = labourIdUrl;
    if (candidateIdImageUrl !== undefined) updateData.candidateIdImageUrl = candidateIdImageUrl;
    if (relativeIdImageUrl !== undefined) updateData.relativeIdImageUrl = relativeIdImageUrl;
    if (body.relativePhones !== undefined) updateData.relativePhones = body.relativePhones || null;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (body.agency !== undefined) updateData.agency = body.agency || 'Sky';
    if (body.passportType !== undefined) updateData.passportType = body.passportType || 'original';
    if (body.languages !== undefined) updateData.languages = body.languages || null;
    if (body.allowVideo !== undefined) updateData.allowVideo = body.allowVideo ? true : false;

    let updated: any = null;

    await db.transaction(async (tx) => {
      await tx.update(quickRegistration)
        .set(updateData)
        .where(eq(quickRegistration.id, id));

      const txUpdated = await tx.select().from(quickRegistration)
        .where(eq(quickRegistration.id, id)).limit(1);

      if (txUpdated[0]) {
        await syncPassportFromQuickReg(tx, {
          passportNumber: txUpdated[0].passportNumber,
          givenNames: txUpdated[0].givenNames,
          surname: txUpdated[0].surname,
          passportImageUrl: txUpdated[0].passportImageUrl,
          passportType: txUpdated[0].passportType,
        });
        updated = txUpdated[0];
      }
    });

    const enrichedUpdated = updated ? await enrichQR(updated) : null;
    res.json(enrichedUpdated);
  } catch (error: any) {
    console.error('Error updating quick registration:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// GET /api/quick-registrations/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req: Request, res: Response) => {
  try {
    const { passportNumber } = req.params;
    const passportUpper = passportNumber.trim().toUpperCase();

    const [reg] = await db.select().from(quickRegistration)
      .where(eq(sql`upper(${quickRegistration.passportNumber})`, passportUpper)).limit(1);

    if (!reg) return res.status(404).json({ error: 'Not found' });

    res.json(await enrichQR(reg));
  } catch (error) {
    console.error('Failed to fetch quick registration by passport:', error);
    res.status(500).json({ error: 'Failed to fetch quick registration by passport' });
  }
});

// GET /api/quick-registrations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reg = await fetchQR(id);
    if (!reg) return res.status(404).json({ error: 'Not found' });
    res.json(reg);
  } catch (error) {
    console.error('Failed to fetch quick registration:', error);
    res.status(500).json({ error: 'Failed to fetch quick registration' });
  }
});

// DELETE /api/quick-registrations/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await db.query.quickRegistration.findFirst({
      where: eq(quickRegistration.id, id)
    });
    if (!existing) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    await db.transaction(async (tx) => {
      if (existing.passportNumber) {
        const cleanPassport = existing.passportNumber.trim().toUpperCase();
        await tx.delete(passport).where(eq(passport.passportNumber, cleanPassport));
        console.log(`[PASSPORT-SYNC] Automatically deleted passport ${cleanPassport} because quick registration was deleted`);
      }

      await tx.delete(quickRegistration).where(eq(quickRegistration.id, id));
    });
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete quick registration:', error);
    res.status(500).json({ error: error.message || 'Failed to delete registration' });
  }
});

export default router;
