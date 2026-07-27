import { Router, Request, Response } from 'express';
import { db } from '../db';
import { passport, quickRegistration, candidate } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';
import { getMajorAgencyFromServerUser } from '../lib/agency-helper';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper to generate a unique random ID (CUID-like)
const generateCuid = (prefix = 'pp') => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 23; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + randomPart;
};

// Safe shelfNo generator
export const getNextShelfNo = async (): Promise<string> => {
  const counterFilePath = path.join(process.cwd(), 'passport_shelf_counter.json');
  let currentCounter = 0;

  // 1. Try reading from the persisted file
  if (fs.existsSync(counterFilePath)) {
    try {
      const fileData = fs.readFileSync(counterFilePath, 'utf8');
      const parsed = JSON.parse(fileData);
      if (typeof parsed.counter === 'number') {
        currentCounter = parsed.counter;
      }
    } catch (e) {
      console.error('Error reading passport_shelf_counter.json:', e);
    }
  }

  // 2. Fallback / double-check against the max shelf number in the database
  try {
    const rows = (await db.execute(sql`
      SELECT MAX(CAST(shelfNo AS UNSIGNED)) AS maxShelf FROM \`Passport\`
    `))[0] as unknown as any[];
    const dbMax = rows[0]?.maxShelf ? Number(rows[0].maxShelf) : 0;
    if (dbMax > currentCounter) {
      currentCounter = dbMax;
    }
  } catch (dbErr) {
    console.warn('Could not query max shelfNo from Passport table:', dbErr);
  }

  const nextNum = currentCounter + 1;
  const shelfNoStr = String(nextNum).padStart(3, '0');

  // 3. Write the updated counter back to file
  try {
    fs.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), 'utf8');
  } catch (e) {
    console.error('Error writing passport_shelf_counter.json:', e);
  }

  return shelfNoStr;
};

const isSameAgency = (itemAgency?: string | null, userAgency?: string) => {
  if (!itemAgency) return true; // Legacy rows without majorAgency are visible
  const a1 = itemAgency.toLowerCase().includes('fenero') ? 'Fenero' : 'Sky';
  const a2 = (userAgency || '').toLowerCase().includes('fenero') ? 'Fenero' : 'Sky';
  return a1 === a2;
};

// GET /api/passports
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = getMajorAgencyFromServerUser(session?.user);

    const allPassports = await db.select().from(passport).orderBy(desc(passport.createdAt));
    const passports = allPassports.filter(p => isSameAgency(p.majorAgency, userAgency));
    res.json(passports);
  } catch (error: any) {
    console.error('Failed to fetch passports:', error);
    res.status(500).json({ error: 'Failed to fetch passports: ' + error.message });
  }
});

// POST /api/passports
router.post('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = getMajorAgencyFromServerUser(session?.user);
    const { passportNumber, fullName, passportImageUrl } = req.body;

    if (!passportNumber || !passportNumber.trim()) {
      return res.status(400).json({ error: 'Passport number is required' });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const cleanPassportNumber = passportNumber.trim().toUpperCase();
    const cleanFullName = fullName.trim().toUpperCase();

    // Check if passport already exists in Passport, QuickRegistration, or Candidate table
    const existingP = await db.query.passport.findFirst({
      where: (p, { eq }) => eq(sql`upper(${p.passportNumber})`, cleanPassportNumber)
    });

    const existingQR = await db.query.quickRegistration.findFirst({
      where: (qr, { eq }) => eq(sql`upper(${qr.passportNumber})`, cleanPassportNumber)
    });

    const existingCand = await db.query.candidate.findFirst({
      where: (c, { eq }) => eq(sql`upper(${c.passportNumber})`, cleanPassportNumber)
    });

    if (
      (existingP && isSameAgency(existingP.majorAgency, userAgency)) ||
      (existingQR && isSameAgency(existingQR.majorAgency, userAgency)) ||
      (existingCand && isSameAgency(existingCand.majorAgency, userAgency))
    ) {
      return res.status(400).json({ error: 'The passport already exists.' });
    }

    // Upload image to local disk / cloud (optional)
    const savedImageUrl = passportImageUrl ? await uploadToLocal(passportImageUrl, 'passports') : null;

    // Generate unique sequential shelfNo
    const shelfNo = await getNextShelfNo();
    const id = generateCuid('pp');

    try {
      await db.insert(passport).values({
        id,
        shelfNo,
        fullName: cleanFullName,
        passportNumber: cleanPassportNumber,
        passportImageUrl: savedImageUrl,
        status: 'Available',
        majorAgency: userAgency,
      });
    } catch (insertErr: any) {
      if (insertErr.message?.includes('Duplicate entry') || insertErr.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'The passport already exists.' });
      }
      throw insertErr;
    }

    const createdPassport = await db.query.passport.findFirst({
      where: eq(passport.id, id)
    });

    res.status(201).json(createdPassport);
  } catch (error: any) {
    console.error('Failed to create passport:', error);
    res.status(500).json({ error: 'Failed to create passport: ' + error.message });
  }
});

// PATCH or POST /api/passports/:id/taken
const handleMarkTaken = async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = getMajorAgencyFromServerUser(session?.user);
    const { id } = req.params;
    const { takenReason, takenByName, takenByPhone } = req.body;

    const existing = await db.query.passport.findFirst({ where: eq(passport.id, id) });
    if (!existing || !isSameAgency(existing.majorAgency, userAgency)) {
      return res.status(404).json({ error: `Passport ID ${id} not found under ${userAgency} agency` });
    }

    if (!takenReason || !['Medical', 'Terminate'].includes(takenReason)) {
      return res.status(400).json({ error: "Invalid or missing 'takenReason'. Must be 'Medical' or 'Terminate'." });
    }
    if (!takenByName || !takenByName.trim()) {
      return res.status(400).json({ error: "Person name who took the passport is required." });
    }
    if (takenReason === 'Terminate' && (!takenByPhone || !takenByPhone.trim())) {
      return res.status(400).json({ error: "Phone number is required for Terminate." });
    }

    const cleanTakerName = takenByName.trim().toUpperCase();
    const cleanTakerPhone = takenByPhone ? takenByPhone.trim() : null;

    await db.update(passport)
      .set({
        status: 'PassportTaken',
        takenReason,
        takenByName: cleanTakerName,
        takenByPhone: cleanTakerPhone,
      })
      .where(eq(passport.id, id));

    res.json({ success: true, message: 'Passport marked as taken successfully' });
  } catch (error: any) {
    console.error('Failed to mark passport as taken:', error);
    res.status(500).json({ error: 'Failed to update passport: ' + error.message });
  }
};

router.patch('/:id/taken', handleMarkTaken);
router.post('/:id/taken', handleMarkTaken);

// PATCH or POST /api/passports/:id/return
const handleReturnPassport = async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = getMajorAgencyFromServerUser(session?.user);
    const { id } = req.params;

    const existing = await db.query.passport.findFirst({ where: eq(passport.id, id) });
    if (!existing || !isSameAgency(existing.majorAgency, userAgency)) {
      return res.status(404).json({ error: `Passport ID ${id} not found under ${userAgency} agency` });
    }

    await db.update(passport)
      .set({
        status: 'Available',
        takenReason: null,
        takenByName: null,
        takenByPhone: null,
      })
      .where(eq(passport.id, id));

    res.json({ success: true, message: 'Passport returned to available successfully' });
  } catch (error: any) {
    console.error('Failed to return passport:', error);
    res.status(500).json({ error: 'Failed to return passport: ' + error.message });
  }
};

router.patch('/:id/return', handleReturnPassport);
router.post('/:id/return', handleReturnPassport);

// DELETE /api/passports/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = getMajorAgencyFromServerUser(session?.user);
    const { id } = req.params;

    const existing = await db.query.passport.findFirst({ where: eq(passport.id, id) });
    if (!existing || !isSameAgency(existing.majorAgency, userAgency)) {
      return res.status(404).json({ error: 'Passport not found' });
    }

    await db.delete(passport).where(eq(passport.id, id));

    res.json({ success: true, message: 'Passport deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete passport:', error);
    res.status(500).json({ error: 'Failed to delete passport: ' + error.message });
  }
});

export default router;
