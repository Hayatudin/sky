import { Router, Request, Response } from 'express';
import { db } from '../db';
import { candidate, quickRegistration, preRegisteredVideo } from '../db/schema';
import { eq, and, or, like, isNotNull, desc } from 'drizzle-orm';
import { uploadToLocal, uploadFileFromDisk } from '../lib/upload';
import { encryptPath, decryptPath, sanitizeIncomingPath } from '../lib/crypto';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'videos';
    if (file.fieldname === 'facePhoto') folder = 'faces';
    else if (file.fieldname === 'fullBodyPhoto') folder = 'fullbody';

    const dir = path.join(process.cwd(), 'public', 'uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.fieldname === 'video' ? '.mp4' : '.jpg');
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

const router = Router();

// Helper to strip all non-alphanumeric characters and collapse spaces/convert to uppercase
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // remove spaces, punctuation, special chars
    .trim();
}

// 1. GET /api/video-uploads/search-candidates?q=...
router.get('/search-candidates', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json([]);

    // Search Candidate model
    const candidatesList = await db.select({
      id: candidate.id,
      givenNames: candidate.givenNames,
      surname: candidate.surname,
      passportNumber: candidate.passportNumber,
      nationality: candidate.nationality,
      passportImageUrl: candidate.passportImageUrl,
    })
    .from(candidate)
    .where(
      or(
        like(candidate.givenNames, `%${query}%`),
        like(candidate.surname, `%${query}%`),
        like(candidate.passportNumber, `%${query}%`)
      )
    )
    .limit(10);

    // Search QuickRegistration model
    const quickRegistrationsList = await db.select({
      id: quickRegistration.id,
      givenNames: quickRegistration.givenNames,
      surname: quickRegistration.surname,
      passportNumber: quickRegistration.passportNumber,
      nationality: quickRegistration.nationality,
      passportImageUrl: quickRegistration.passportImageUrl,
    })
    .from(quickRegistration)
    .where(
      or(
        like(quickRegistration.givenNames, `%${query}%`),
        like(quickRegistration.surname, `%${query}%`),
        like(quickRegistration.passportNumber, `%${query}%`)
      )
    )
    .limit(10);

    // Format and combine results
    const combined = [
      ...candidatesList.map(c => ({
        ...c,
        source: 'candidate',
        fullName: `${c.givenNames} ${c.surname}`.trim().toUpperCase(),
      })),
      ...quickRegistrationsList.map(q => ({
        ...q,
        source: 'quickRegistration',
        fullName: `${q.givenNames} ${q.surname}`.trim().toUpperCase(),
      })),
    ];

    res.json(combined.slice(0, 15));
  } catch (error: any) {
    console.error('Error searching candidates for video uploads:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 2. POST /api/video-uploads/save
router.post('/save', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'facePhoto', maxCount: 1 },
  { name: 'fullBodyPhoto', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const { id, source, passportNumber } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.['video']?.[0];
    const facePhotoFile = files?.['facePhoto']?.[0];
    const fullBodyPhotoFile = files?.['fullBodyPhoto']?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const [finalVideoUrl, facePhoto, fullBodyPhoto] = await Promise.all([
      uploadFileFromDisk(videoFile.path, 'videos'),
      facePhotoFile ? uploadFileFromDisk(facePhotoFile.path, 'faces') : Promise.resolve(null),
      fullBodyPhotoFile ? uploadFileFromDisk(fullBodyPhotoFile.path, 'fullbody') : Promise.resolve(null)
    ]);

    if (!finalVideoUrl) {
      return res.status(400).json({ error: 'Failed to process video file' });
    }

    // A. Attach to an existing registered candidate directly
    if (id && source) {
      if (source === 'candidate') {
        await db.update(candidate)
          .set({
            videoUrl: finalVideoUrl,
            facePhotoUrl: facePhoto || undefined,
            fullBodyPhotoUrl: fullBodyPhoto || undefined,
            allowVideo: true,
          })
          .where(eq(candidate.id, id));

        const updated = await db.query.candidate.findFirst({
          where: eq(candidate.id, id)
        });

        if (!updated) {
          return res.status(404).json({ error: 'Candidate not found' });
        }

        return res.json({ 
          success: true, 
          message: 'Attached to Candidate profile', 
          data: {
            ...updated,
            videoUrl: encryptPath(updated.videoUrl),
            facePhotoUrl: encryptPath(updated.facePhotoUrl),
            fullBodyPhotoUrl: encryptPath(updated.fullBodyPhotoUrl)
          } 
        });
      } else if (source === 'quickRegistration') {
        await db.update(quickRegistration)
          .set({
            videoUrl: finalVideoUrl,
            allowVideo: true,
          })
          .where(eq(quickRegistration.id, id));

        return res.json({ success: true, message: 'Attached to QuickRegistration record' });
      }
    }

    // B. Pre-registration mode: save by Passport Number
    if (!passportNumber || !passportNumber.trim()) {
      return res.status(400).json({ error: 'Passport number is required for pre-registration' });
    }

    const cleanedPassportNumber = passportNumber.trim().toUpperCase();

    // Use raw MySQL query upsert logic via Drizzle onDuplicateKeyUpdate
    const generatedId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    await db.insert(preRegisteredVideo).values({
      id: generatedId,
      passportNumber: cleanedPassportNumber,
      videoUrl: finalVideoUrl,
      facePhotoUrl: facePhoto || null,
      fullBodyPhotoUrl: fullBodyPhoto || null,
    }).onDuplicateKeyUpdate({
      set: {
        videoUrl: finalVideoUrl,
        facePhotoUrl: facePhoto || null,
        fullBodyPhotoUrl: fullBodyPhoto || null,
      }
    });

    const result = await db.query.preRegisteredVideo.findFirst({
      where: eq(preRegisteredVideo.passportNumber, cleanedPassportNumber)
    });

    if (!result) {
      throw new Error('Failed to retrieve newly created pre-registered video');
    }

    res.json({ 
      success: true, 
      message: 'Pre-registration video & photos saved successfully', 
      data: {
        ...result,
        videoUrl: encryptPath(result.videoUrl),
        facePhotoUrl: encryptPath(result.facePhotoUrl),
        fullBodyPhotoUrl: encryptPath(result.fullBodyPhotoUrl)
      } 
    });
  } catch (error: any) {
    console.error('Error saving video upload record:', error);
    res.status(500).json({ error: error.message || 'Failed to save video record' });
  }
});

// 3. GET /api/video-uploads/match?passportNumber=...
router.get('/match', async (req: Request, res: Response) => {
  try {
    const passportNumber = (req.query.passportNumber as string || '').trim().toUpperCase();
    const givenNames = (req.query.givenNames as string || '').trim().toUpperCase();
    const surname = (req.query.surname as string || '').trim().toUpperCase();

    // A. Priority matching by Passport Number
    if (passportNumber) {
      const matchingVideo = await db.query.preRegisteredVideo.findFirst({
        where: eq(preRegisteredVideo.passportNumber, passportNumber)
      });

      if (matchingVideo) {
        return res.json({
          matchFound: true,
          videoUrl: encryptPath(matchingVideo.videoUrl),
          facePhotoUrl: encryptPath(matchingVideo.facePhotoUrl),
          fullBodyPhotoUrl: encryptPath(matchingVideo.fullBodyPhotoUrl),
          matchedName: `PASSPORT: ${matchingVideo.passportNumber}`,
        });
      }
    }

    // B. Fallback matching by Fuzzy Name if passportNumber not supplied
    if (givenNames || surname) {
      const fullCombined = `${givenNames} ${surname}`.trim();
      const normalizedTarget = normalizeName(fullCombined);

      // Fetch all buffered videos from database
      const preRegistered = await db.select().from(preRegisteredVideo);

      const matchingVideo = preRegistered.find(item => {
        const normalizedItemName = normalizeName(item.passportNumber);
        return (
          normalizedItemName === normalizedTarget ||
          normalizedItemName.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedItemName)
        );
      });

      if (matchingVideo) {
        return res.json({
          matchFound: true,
          videoUrl: encryptPath(matchingVideo.videoUrl),
          facePhotoUrl: encryptPath(matchingVideo.facePhotoUrl),
          fullBodyPhotoUrl: encryptPath(matchingVideo.fullBodyPhotoUrl),
          matchedName: `PASSPORT: ${matchingVideo.passportNumber}`,
        });
      }
    }

    res.json({ matchFound: false });
  } catch (error: any) {
    console.error('Error checking video match:', error);
    res.status(500).json({ error: 'Match check failed' });
  }
});

// 4. GET /api/video-uploads/uploaded — List all records that have a video URL
router.get('/uploaded', async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').trim();

    // Candidates with videoUrl
    let candidateConditions: any = isNotNull(candidate.videoUrl);
    if (q) {
      candidateConditions = and(
        isNotNull(candidate.videoUrl),
        or(
          like(candidate.givenNames, `%${q}%`),
          like(candidate.surname, `%${q}%`),
          like(candidate.passportNumber, `%${q}%`)
        )
      );
    }
    const candidatesList = await db.select({
      id: candidate.id,
      givenNames: candidate.givenNames,
      surname: candidate.surname,
      passportNumber: candidate.passportNumber,
      nationality: candidate.nationality,
      videoUrl: candidate.videoUrl,
      facePhotoUrl: candidate.facePhotoUrl,
      fullBodyPhotoUrl: candidate.fullBodyPhotoUrl,
      registeredAt: candidate.registeredAt,
    })
    .from(candidate)
    .where(candidateConditions)
    .orderBy(desc(candidate.registeredAt));

    // PreRegisteredVideo records (buffered)
    let preRegs = await db.select().from(preRegisteredVideo).orderBy(desc(preRegisteredVideo.createdAt));
    if (q) {
      const qUp = q.toUpperCase();
      preRegs = preRegs.filter((p: any) => (p.passportNumber || '').includes(qUp));
    }

    // Combine into a unified list, encrypting local URLs
    const results = [
      ...candidatesList.map((c: any) => ({
        id: c.id,
        fullName: `${c.givenNames} ${c.surname}`.trim().toUpperCase(),
        passportNumber: c.passportNumber || '',
        nationality: c.nationality || '',
        videoUrl: encryptPath(c.videoUrl),
        facePhotoUrl: encryptPath(c.facePhotoUrl),
        fullBodyPhotoUrl: encryptPath(c.fullBodyPhotoUrl),
        date: c.registeredAt?.toISOString() || '',
        source: 'candidate' as const,
      })),
      ...preRegs.map((p: any) => ({
        id: p.id,
        fullName: `PASSPORT: ${p.passportNumber || ''}`,
        passportNumber: p.passportNumber || '',
        nationality: '',
        videoUrl: encryptPath(p.videoUrl),
        facePhotoUrl: encryptPath(p.facePhotoUrl),
        fullBodyPhotoUrl: encryptPath(p.fullBodyPhotoUrl),
        date: p.createdAt ? new Date(p.createdAt).toISOString() : '',
        source: 'preRegistered' as const,
      })),
    ];

    // De-duplicate by videoUrl
    const seen = new Set<string>();
    const unique = results.filter(r => {
      if (!r.videoUrl) return false;
      if (seen.has(r.videoUrl)) return false;
      seen.add(r.videoUrl);
      return true;
    });

    res.json(unique);
  } catch (error: any) {
    console.error('Error fetching uploaded videos:', error);
    res.status(500).json({ error: 'Failed to fetch uploaded videos' });
  }
});

// 5. PUT /api/video-uploads/:source/:id — Update video link for a record
router.put('/:source/:id', async (req: Request, res: Response) => {
  try {
    const { source, id } = req.params;
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const sanitizedVideoUrl = sanitizeIncomingPath(videoUrl);

    if (source === 'candidate') {
      await db.update(candidate)
        .set({ videoUrl: sanitizedVideoUrl })
        .where(eq(candidate.id, id));
      return res.json({ success: true, message: 'Candidate video updated successfully' });
    } else if (source === 'quickRegistration') {
      await db.update(quickRegistration)
        .set({ videoUrl: sanitizedVideoUrl })
        .where(eq(quickRegistration.id, id));
      return res.json({ success: true, message: 'Quick registration video updated successfully' });
    } else if (source === 'preRegistered') {
      await db.update(preRegisteredVideo)
        .set({ videoUrl: sanitizedVideoUrl })
        .where(eq(preRegisteredVideo.id, id));
      return res.json({ success: true, message: 'Pre-registered video updated successfully' });
    }

    res.status(400).json({ error: 'Invalid source type' });
  } catch (error: any) {
    console.error('Error updating video upload:', error);
    res.status(500).json({ error: error.message || 'Failed to update video' });
  }
});

// 6. DELETE /api/video-uploads/:source/:id — Remove video link/delete pre-registered record
router.delete('/:source/:id', async (req: Request, res: Response) => {
  try {
    const { source, id } = req.params;

    if (source === 'candidate') {
      await db.update(candidate)
        .set({ videoUrl: null })
        .where(eq(candidate.id, id));
      return res.json({ success: true, message: 'Candidate video removed successfully' });
    } else if (source === 'quickRegistration') {
      await db.update(quickRegistration)
        .set({ videoUrl: null })
        .where(eq(quickRegistration.id, id));
      return res.json({ success: true, message: 'Quick registration video removed successfully' });
    } else if (source === 'preRegistered') {
      await db.delete(preRegisteredVideo)
        .where(eq(preRegisteredVideo.id, id));
      return res.json({ success: true, message: 'Pre-registered video record deleted successfully' });
    }

    res.status(400).json({ error: 'Invalid source type' });
  } catch (error: any) {
    console.error('Error deleting video upload:', error);
    res.status(500).json({ error: error.message || 'Failed to delete video' });
  }
});

export default router;
