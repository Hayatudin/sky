import { Router, Request, Response } from 'express';
import { db } from '../db';
import { candidate, generatedCV, notification, user } from '../db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '../lib/auth-helper';
import { encryptPath } from '../lib/crypto';

const router = Router();

// Auto-verify and create missing columns in Candidate table to prevent crashes on stale databases
async function ensureCandidateColumns() {
  try {
    const columns = (await db.execute(sql`SHOW COLUMNS FROM \`Candidate\``))[0] as unknown as any[];
    const existingFields = new Set(columns.map(c => c.Field.toLowerCase()));
    
    const requiredColumns = [
      { name: 'embassyIssue', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'cocStatus', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'tasheerStatus', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'wakalaStatus', definition: "VARCHAR(191) DEFAULT 'Unpaid'" },
      { name: 'qrCodeStatus', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'selectedType', definition: "VARCHAR(191) DEFAULT 'Private'" },
      { name: 'travelDate', definition: "DATETIME(3) NULL" },
      { name: 'agencyStatus', definition: "VARCHAR(191) DEFAULT 'Under Process'" }
    ];

    for (const col of requiredColumns) {
      if (!existingFields.has(col.name.toLowerCase())) {
        console.log(`[DATABASE SETUP] Column '${col.name}' is missing in Candidate table. Adding it...`);
        await db.execute(sql`ALTER TABLE \`Candidate\` ADD COLUMN \`${sql.raw(col.name)}\` ${sql.raw(col.definition)}`);
      }
    }
  } catch (err) {
    console.error('[DATABASE SETUP] Failed to verify/add Candidate columns:', err);
  }
}

// Kick off checking asynchronously
ensureCandidateColumns();

// Email-to-agency template ID resolver fallback mapping
function inferAgencyFromEmail(email: string): string | null {
  const e = email.toLowerCase();
  if (e.includes('ussus')) return 'ussus';
  if (e.includes('khuzam') || e.includes('ku2')) return 'ku2';
  if (e.includes('kafaat') || e.includes('ka7')) return 'ka7';
  if (e.includes('alaalam') || e.includes('alm')) return 'alm';
  if (e.includes('rayaat') || e.includes('ra')) return 'ra';
  if (e.includes('shablan')) return 'al-shablan';
  if (e.includes('vision')) return 'vision';
  if (e.includes('ma')) return 'ma';
  return null;
}

// Check and auto-heal agency value in database
async function resolveAndHealAgency(sessionUser: any): Promise<string | null> {
  if (sessionUser.agency) return sessionUser.agency;
  
  if (sessionUser.email) {
    const inferred = inferAgencyFromEmail(sessionUser.email);
    if (inferred) {
      console.log(`[AUTH-HEAL] Inferred agency '${inferred}' for user '${sessionUser.email}'. Auto-healing user record in DB...`);
      try {
        await db.update(user)
          .set({ agency: inferred })
          .where(eq(user.id, sessionUser.id));
      } catch (err) {
        console.error('[AUTH-HEAL] Failed to update user agency in DB:', err);
      }
      return inferred;
    }
  }
  return null;
}

// GET /api/agency/debug-info
router.get('/debug-info', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.json({ error: 'No session found on server headers' });
    }

    const role = session.user.role;
    const agencyName = await resolveAndHealAgency(session.user);

    // Get stats from database
    const candidateCountResult = await db.select({ count: sql<number>`count(*)` }).from(candidate);
    const totalCandidates = Number(candidateCountResult[0]?.count || 0);

    const cvCountResult = await db.select({ count: sql<number>`count(*)` }).from(generatedCV);
    const totalCVs = Number(cvCountResult[0]?.count || 0);
    
    // Get unique template IDs in GeneratedCV
    const uniqueTemplates = await db.select({
      templateId: generatedCV.templateId,
      count: sql<number>`count(*)`
    })
    .from(generatedCV)
    .groupBy(generatedCV.templateId);

    const sampleCandidates = await db.select({
      id: candidate.id,
      givenNames: candidate.givenNames,
      surname: candidate.surname,
      agency: candidate.agency
    })
    .from(candidate)
    .limit(5);

    res.json({
      sessionUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: role,
        agency: agencyName
      },
      databaseStats: {
        totalCandidates,
        totalCVs,
        uniqueTemplates: uniqueTemplates.map(t => ({ templateId: t.templateId, count: Number(t.count) })),
        sampleCandidates
      }
    });
  } catch (err: any) {
    res.json({ error: err.message || String(err) });
  }
});

// GET /api/agency/candidates
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const { agency } = req.query;
    const conditions: any[] = [eq(candidate.agencySelected, true)];
 
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      conditions.push(
        or(
          eq(candidate.agency, agencyStr),
          sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\` and gc.\`templateId\` like ${`%${agencyStr}%`})`
        )
      );
    } else {
      if (agency && agency !== 'all') {
        const agencyStr = String(agency).toLowerCase();
        conditions.push(
          or(
            eq(candidate.agency, agencyStr),
            sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\` and gc.\`templateId\` like ${`%${agencyStr}%`})`
          )
        );
      }
    }

    const dbCandidatesList = await db.query.candidate.findMany({
      where: and(...conditions),
      orderBy: (c, { desc }) => [desc(c.registeredAt)],
      with: {
        generatedCVs: { columns: { id: true, templateId: true } },
        broker: { columns: { name: true } },
        invoices: { columns: { id: true, lmisQrCodeUrl: true } }
      }
    });

    res.json(dbCandidatesList.map((c: any) => {
      const invoicesList = c.invoices || [];
      const hasQrCode = invoicesList.some((inv: any) => inv.lmisQrCodeUrl && inv.lmisQrCodeUrl.trim() !== '');
      return {
        id: c.id,
        givenNames: c.givenNames,
        surname: c.surname,
        passportNumber: c.passportNumber,
        embassyIssue: c.embassyIssue || 'No',
        cocStatus: c.cocStatus || 'No',
        medicalStatus: c.medicalStatus || 'Pending',
        tasheerStatus: c.tasheerStatus || 'No',
        wakalaStatus: c.wakalaStatus || 'Unpaid',
        qrCodeStatus: hasQrCode ? 'Yes' : 'No',
        selectedType: c.selectedType || 'Private',
        travelDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
        agencyStatus: c.agencyStatus || 'Under Process',
        latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
        broker: c.broker,
        agency: c.agency,
        religion: c.religion,
        job: c.job,
        city: c.city,
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString() : null,
        videoUrl: encryptPath(c.videoUrl) || null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : null,
        allowVideo: c.allowVideo ?? false,
        visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null
      };
    }));

  } catch (err) {
    console.error('[AGENCY] Failed to fetch candidates', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agency/available-candidates
router.get('/available-candidates', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const { agency } = req.query;
    const conditions: any[] = [
      eq(candidate.agencySelected, false),
      sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\`)`
    ];
 
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      conditions.push(
        or(
          eq(candidate.agency, agencyStr),
          sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\` and gc.\`templateId\` like ${`%${agencyStr}%`})`
        )
      );
    } else {
      if (agency && agency !== 'all') {
        const agencyStr = String(agency).toLowerCase();
        conditions.push(
          or(
            eq(candidate.agency, agencyStr),
            sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\` and gc.\`templateId\` like ${`%${agencyStr}%`})`
          )
        );
      }
    }

    const dbCandidatesList = await db.query.candidate.findMany({
      where: and(...conditions),
      orderBy: (c, { desc }) => [desc(c.registeredAt)],
      with: {
        generatedCVs: { columns: { id: true, templateId: true } },
        broker: { columns: { name: true } }
      }
    });

    res.json(dbCandidatesList.map((c: any) => {
      return {
        id: c.id,
        givenNames: c.givenNames,
        surname: c.surname,
        passportNumber: c.passportNumber,
        embassyIssue: c.embassyIssue || 'No',
        cocStatus: c.cocStatus || 'No',
        medicalStatus: c.medicalStatus || 'Pending',
        tasheerStatus: c.tasheerStatus || 'No',
        wakalaStatus: c.wakalaStatus || 'Unpaid',
        qrCodeStatus: 'No',
        selectedType: c.selectedType || 'Private',
        travelDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
        agencyStatus: c.agencyStatus || 'Under Process',
        latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
        broker: c.broker,
        agency: c.agency,
        religion: c.religion,
        job: c.job,
        city: c.city,
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString() : null,
        videoUrl: encryptPath(c.videoUrl) || null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : null,
        facePhotoUrl: c.facePhotoUrl,
        fullBodyPhotoUrl: c.fullBodyPhotoUrl,
        passportImageUrl: c.passportImageUrl,
        nationality: c.nationality,
        educationLevel: c.educationLevel,
        maritalStatus: c.maritalStatus,
        workExperience: c.workExperience,
        skills: c.skills,
        allowVideo: c.allowVideo ?? false,
        visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null
      };
    }));

  } catch (err) {
    console.error('[AGENCY] Failed to fetch available candidates', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/agency/candidates/:id/select
router.post('/candidates/:id/select', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    // Verify candidate belongs to agency if updating as agency
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      const hasAccess = await db.query.candidate.findFirst({
        where: and(
          eq(candidate.id, id),
          sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\` and gc.\`templateId\` like ${`%${agencyStr}%`})`
        )
      });
      if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this candidate' });
      }
    }

    const cand = await db.query.candidate.findFirst({
      where: eq(candidate.id, id)
    });

    if (!cand) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const agencyLabel = agencyName ? agencyName.toUpperCase() : 'AGENCY';

    await db.update(candidate)
      .set({ agencySelected: true })
      .where(eq(candidate.id, id));
      
    await db.insert(notification).values({
      title: 'Candidate Selected',
      message: `Candidate ${cand.givenNames} ${cand.surname} (${cand.passportNumber}) has been selected by agency ${agencyLabel}.`,
      candidateId: cand.id
    });

    const updated = await db.query.candidate.findFirst({
      where: eq(candidate.id, id)
    });
      
    res.json(updated);
  } catch (err) {
    console.error('[AGENCY] Failed to select candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/agency/candidates/:id
router.patch('/candidates/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (!['super_admin', 'agency', 'processor', 'coordinator'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { 
      embassyIssue, 
      cocStatus, 
      medicalStatus, 
      tasheerStatus, 
      wakalaStatus, 
      qrCodeStatus, 
      selectedType, 
      travelDate, 
      agencyStatus 
    } = req.body;

    const agencyName = await resolveAndHealAgency(session.user);

    if (role === 'agency') {
      if (!agencyName) {
        return res.status(400).json({ error: 'User is not assigned to any agency' });
      }
      const hasAccess = await db.query.candidate.findFirst({
        where: and(
          eq(candidate.id, id),
          sql`exists (select 1 from \`GeneratedCV\` gc where gc.\`candidateId\` = \`Candidate\`.\`id\` and gc.\`templateId\` like ${`%${agencyName.toLowerCase()}%`})`
        )
      });
      if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this candidate' });
      }
    }

    const updateData: any = {};
    if (embassyIssue !== undefined) updateData.embassyIssue = embassyIssue;
    if (cocStatus !== undefined) updateData.cocStatus = cocStatus;
    if (medicalStatus !== undefined) updateData.medicalStatus = medicalStatus;
    if (tasheerStatus !== undefined) updateData.tasheerStatus = tasheerStatus;
    if (wakalaStatus !== undefined) updateData.wakalaStatus = wakalaStatus;
    if (qrCodeStatus !== undefined) updateData.qrCodeStatus = qrCodeStatus;
    if (selectedType !== undefined) updateData.selectedType = selectedType;
    if (travelDate !== undefined) {
      updateData.travelDate = travelDate ? new Date(travelDate) : null;
    }
    if (agencyStatus !== undefined) updateData.agencyStatus = agencyStatus;

    await db.update(candidate)
      .set(updateData)
      .where(eq(candidate.id, id));

    const updated = await db.query.candidate.findFirst({
      where: eq(candidate.id, id)
    });

    res.json(updated);
  } catch (err) {
    console.error('[AGENCY] Failed to patch candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
