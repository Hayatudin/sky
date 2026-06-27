import { Router, Request, Response } from 'express';
import { db } from '../db';
import { broker, leader, candidate, quickRegistration, generatedCV } from '../db/schema';
import { eq, inArray, and, gte, lte, or, like } from 'drizzle-orm';
import { getSession } from '../lib/auth-helper';

const router = Router();

// Helper: fetch isLocked values for all brokers
async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const rows = await db.select({ id: broker.id, isLocked: broker.isLocked }).from(broker);
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked;
    }
    return map;
  } catch (e) {
    console.warn('[BROKER] Could not fetch isLocked column, defaulting all to false:', e);
    return {};
  }
}

// Helper: fetch single broker isLocked
async function getBrokerIsLocked(id: string): Promise<boolean> {
  try {
    const row = await db.query.broker.findFirst({
      where: eq(broker.id, id),
      columns: { isLocked: true }
    });
    return row?.isLocked ?? false;
  } catch (e) {
    console.warn('[BROKER] Could not fetch isLocked for broker', id, e);
    return false;
  }
}

// Helper: set broker isLocked
async function setBrokerIsLocked(id: string, locked: boolean): Promise<void> {
  await db.update(broker)
    .set({ isLocked: locked })
    .where(eq(broker.id, id));
}

// GET /api/brokers
router.get('/', async (req: Request, res: Response) => {
  try {
    const brokersList = await db.query.broker.findMany({
      with: {
        candidates: {
          columns: {
            id: true,
            givenNames: true,
            surname: true,
            passportNumber: true,
            facePhotoUrl: true,
            fullBodyPhotoUrl: true,
          },
          with: {
            generatedCVs: {
              columns: {
                id: true,
                templateId: true
              }
            }
          }
        }
      },
      orderBy: (b, { asc }) => [asc(b.name)]
    });

    // Fetch all leaders
    const leadersList = await db.select({ id: leader.id, name: leader.name }).from(leader);
    const leaderMap = new Map<string, { id: string; name: string }>();
    leadersList.forEach(l => leaderMap.set(l.id, l));

    const lockMap = await getBrokerLockMap();
    const augmented = brokersList.map((b: any) => {
      const lead = b.leaderId ? leaderMap.get(b.leaderId) : null;
      return {
        id: b.id,
        name: b.name,
        leaderId: b.leaderId,
        isLocked: lockMap[b.id] ?? b.isLocked ?? false,
        createdAt: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt.toISOString(),
        candidates: b.candidates.map((c: any) => ({
          id: c.id,
          givenNames: c.givenNames,
          surname: c.surname,
          passportNumber: c.passportNumber,
          facePhotoUrl: c.facePhotoUrl,
          fullBodyPhotoUrl: c.fullBodyPhotoUrl,
          generatedCVs: c.generatedCVs
        })),
        leader: lead,
        _count: {
          candidates: b.candidates?.length || 0
        }
      };
    });

    res.json(augmented);
  } catch (error: any) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch brokers',
      message: error?.message || String(error),
      code: error?.code,
    });
  }
});

// POST /api/brokers
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Broker name is required' });

    // Generate CUID-like ID manually: cl + 23 alphanumeric characters = 25 chars
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 23; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const brokerId = 'cl' + randomPart;

    await db.insert(broker).values({
      id: brokerId,
      name: name.trim()
    });

    // Auto-assign new broker to 'DAERA OFFICE' leader group
    try {
      const leaderRows = await db.select({ id: leader.id })
        .from(leader)
        .where(eq(leader.name, 'DAERA OFFICE'))
        .limit(1);

      let daeraLeaderId = null;
      if (leaderRows.length > 0) {
        daeraLeaderId = leaderRows[0].id;
      } else {
        // Auto-create leader "DAERA OFFICE" if missing
        const newLeaderId = 'cl' + Array.from({length: 23}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        await db.insert(leader).values({
          id: newLeaderId,
          name: 'DAERA OFFICE'
        });
        daeraLeaderId = newLeaderId;
      }
      
      if (daeraLeaderId) {
        await db.update(broker)
          .set({ leaderId: daeraLeaderId })
          .where(eq(broker.id, brokerId));
        console.log(`[BROKER-CREATE] Automatically assigned new broker "${name.trim()}" to Leader "DAERA OFFICE"`);
      }
    } catch (e) {
      console.warn('[BROKER-CREATE] Failed to auto-assign/create DAERA OFFICE leader:', e);
    }
    
    const createdBroker = await db.query.broker.findFirst({
      where: eq(broker.id, brokerId)
    });

    res.json({
      ...createdBroker,
      _count: { candidates: 0 }
    });
  } catch (error: any) {
    console.error('Error creating broker:', error);
    if (error.message?.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A broker with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create broker. Please try again.' });
  }
});

// POST /api/brokers/move-candidates-bulk — Move specific candidates to another broker in bulk
router.post('/move-candidates-bulk', async (req: Request, res: Response) => {
  try {
    const { candidateIds, targetBrokerId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'Candidate IDs array is required' });
    }

    if (!targetBrokerId) {
      return res.status(400).json({ error: 'Target broker ID is required' });
    }

    // Verify target broker exists
    const targetBroker = await db.query.broker.findFirst({ where: eq(broker.id, targetBrokerId) });
    if (!targetBroker) {
      return res.status(404).json({ error: 'Target broker not found' });
    }

    // Move candidates
    const [result] = await db.update(candidate)
      .set({ brokerId: targetBrokerId })
      .where(inArray(candidate.id, candidateIds));

    const movedCount = (result as any).affectedRows || 0;
    console.log(`[BROKER-MOVE-BULK] Moved ${movedCount} candidate(s) to "${targetBroker.name}"`);

    res.json({
      success: true,
      movedCount,
      message: `Successfully moved ${movedCount} candidate(s) to "${targetBroker.name}"`
    });
  } catch (error: any) {
    console.error('Failed to move candidates in bulk:', error);
    res.status(500).json({ error: error.message || 'Failed to move candidates' });
  }
});

// GET /api/brokers/:id/candidates
router.get('/:id/candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { search, interval, startDate, endDate } = req.query;

    const conditions: any[] = [eq(candidate.brokerId, id)];

    if (interval && interval !== 'ALL') {
      const now = new Date();
      let from = new Date(now);
      if (interval === '1D') from.setDate(from.getDate() - 1);
      else if (interval === '1W') from.setDate(from.getDate() - 7);
      else if (interval === '1M') from.setMonth(from.getMonth() - 1);
      else if (interval === '1Y') from.setFullYear(from.getFullYear() - 1);
      conditions.push(gte(candidate.registeredAt, from));
    }
    if (startDate) conditions.push(gte(candidate.registeredAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(candidate.registeredAt, new Date(endDate as string)));

    if (search) {
      const searchStr = `%${search}%`;
      conditions.push(
        or(
          like(candidate.givenNames, searchStr),
          like(candidate.surname, searchStr),
          like(candidate.passportNumber, searchStr)
        )
      );
    }

    const brokerRecord = await db.query.broker.findFirst({
      where: eq(broker.id, id),
    });

    if (!brokerRecord) return res.status(404).json({ error: 'Broker not found' });

    const candidatesList = await db.query.candidate.findMany({
      where: and(...conditions),
      orderBy: (c, { desc }) => [desc(c.registeredAt)],
      with: {
        generatedCVs: {
          columns: {
            id: true,
            templateId: true,
            facePhotoUrl: true,
            fullBodyPhotoUrl: true,
            createdAt: true
          }
        }
      }
    });

    // Resolve lock status
    const isLocked = await getBrokerIsLocked(id);

    // Resolve requester role
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';

    const augmentedBroker = {
      ...brokerRecord,
      isLocked,
      candidates: candidatesList.map((c: any) => ({
        ...c,
        price: isSuperAdmin ? (c.price ?? null) : null,
      })),
    };

    res.json(augmentedBroker);
  } catch (error) {
    console.error('Error fetching broker candidates:', error);
    res.status(500).json({ error: 'Failed to fetch broker candidates' });
  }
});

// POST /api/brokers/:id/move-candidates — Move all candidates to another broker
router.post('/:id/move-candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetBrokerId } = req.body;

    if (!targetBrokerId) {
      return res.status(400).json({ error: 'Target broker ID is required' });
    }

    if (id === targetBrokerId) {
      return res.status(400).json({ error: 'Cannot move candidates to the same broker' });
    }

    // Verify source broker exists
    const sourceBroker = await db.query.broker.findFirst({ where: eq(broker.id, id) });
    if (!sourceBroker) {
      return res.status(404).json({ error: 'Source broker not found' });
    }

    // Verify target broker exists
    const targetBroker = await db.query.broker.findFirst({ where: eq(broker.id, targetBrokerId) });
    if (!targetBroker) {
      return res.status(404).json({ error: 'Target broker not found' });
    }

    // Move all candidates
    const [candidateResult] = await db.update(candidate)
      .set({ brokerId: targetBrokerId })
      .where(eq(candidate.brokerId, id));

    // Also move quick registrations
    await db.update(quickRegistration)
      .set({ brokerId: targetBrokerId })
      .where(eq(quickRegistration.brokerId, id));

    const movedCount = (candidateResult as any).affectedRows || 0;
    console.log(`[BROKER-MOVE] Moved ${movedCount} candidates from "${sourceBroker.name}" to "${targetBroker.name}"`);

    res.json({
      success: true,
      movedCount,
      message: `Successfully moved ${movedCount} candidate(s) from "${sourceBroker.name}" to "${targetBroker.name}"`
    });
  } catch (error: any) {
    console.error('Failed to move candidates:', error);
    res.status(500).json({ error: error.message || 'Failed to move candidates' });
  }
});

// DELETE /api/brokers/:id — Delete broker directly
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if broker exists
    const brokerRecord = await db.query.broker.findFirst({ where: eq(broker.id, id) });
    if (!brokerRecord) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    // Disconnect all candidates (set brokerId to null)
    await db.update(candidate)
      .set({ brokerId: null })
      .where(eq(candidate.brokerId, id));

    // Disconnect all quick registrations
    await db.update(quickRegistration)
      .set({ brokerId: null })
      .where(eq(quickRegistration.brokerId, id));

    // Delete the broker
    await db.delete(broker)
      .where(eq(broker.id, id));

    console.log(`[BROKER-DELETE] Broker "${brokerRecord.name}" deleted.`);

    res.json({ success: true, message: `Broker "${brokerRecord.name}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete broker:', error);
    res.status(500).json({ error: error.message || 'Failed to delete broker' });
  }
});

// PATCH /api/brokers/:id/toggle-lock — Lock/Unlock broker (hides/shows CVs)
router.patch('/:id/toggle-lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the broker
    const brokerRecord = await db.query.broker.findFirst({ where: eq(broker.id, id) });
    if (!brokerRecord) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    const currentLockState = await getBrokerIsLocked(id);
    const newLockState = !currentLockState;

    // Toggle the lock status
    await setBrokerIsLocked(id, newLockState);

    // Re-fetch broker to return
    const updated = await db.query.broker.findFirst({ where: eq(broker.id, id) });

    console.log(`[BROKER-LOCK] Broker "${updated?.name}" ${newLockState ? 'LOCKED' : 'UNLOCKED'}`);

    res.json({
      ...updated,
      isLocked: newLockState
    });
  } catch (error: any) {
    console.error('Failed to toggle broker lock:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle broker lock' });
  }
});

// POST /api/brokers/move-bulk — Move multiple brokers to a leader
router.post('/move-bulk', async (req: Request, res: Response) => {
  try {
    const { brokerIds, leaderId } = req.body; // leaderId can be string or null

    if (!brokerIds || !Array.isArray(brokerIds) || brokerIds.length === 0) {
      return res.status(400).json({ error: 'Broker IDs array is required' });
    }

    // If leaderId is provided, verify it exists
    if (leaderId !== null && leaderId !== undefined && leaderId !== '') {
      const leaderRow = await db.query.leader.findFirst({ where: eq(leader.id, leaderId) });
      if (!leaderRow) {
        return res.status(404).json({ error: 'Target leader not found' });
      }
    }

    // Update the leaderId of all specified brokers
    await db.update(broker)
      .set({ leaderId: leaderId || null })
      .where(inArray(broker.id, brokerIds));

    console.log(`[BROKER-MOVE-BULK] Moved ${brokerIds.length} brokers to leader: ${leaderId || 'None'}`);

    res.json({ success: true, movedCount: brokerIds.length });
  } catch (error: any) {
    console.error('Failed to move brokers in bulk via Drizzle:', error);
    res.status(500).json({ error: error.message || 'Failed to move brokers in bulk' });
  }
});

// PATCH /api/brokers/:id/leader — Assign or change broker's leader
router.patch('/:id/leader', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leaderId } = req.body; // Can be string or null

    // Find the broker
    const brokerRecord = await db.query.broker.findFirst({ where: eq(broker.id, id) });
    if (!brokerRecord) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    // If leaderId is provided, make sure the leader exists
    if (leaderId !== null && leaderId !== undefined && leaderId !== '') {
      const leaderRow = await db.query.leader.findFirst({ where: eq(leader.id, leaderId) });
      if (!leaderRow) {
        return res.status(404).json({ error: 'Target leader not found' });
      }
    }

    // Update the broker's leaderId
    await db.update(broker)
      .set({ leaderId: leaderId || null })
      .where(eq(broker.id, id));

    // Fetch broker count and info cleanly
    const updated = await db.query.broker.findFirst({ where: eq(broker.id, id) });

    // Fetch leader details
    let leaderObj = null;
    if (leaderId) {
      leaderObj = await db.query.leader.findFirst({ where: eq(leader.id, leaderId) }) || null;
    }

    const responseObj = {
      ...updated,
      leader: leaderObj
    };

    console.log(`[BROKER-LEADER] Moved broker "${brokerRecord.name}" to leader: ${leaderObj?.name || 'None'}`);

    res.json(responseObj);
  } catch (error: any) {
    console.error('Failed to update broker leader:', error);
    res.status(500).json({ error: error.message || 'Failed to update broker leader' });
  }
});

// POST /api/brokers/:id/change-template — Bulk change CV template for all candidates under broker
router.post('/:id/change-template', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Verify broker exists
    const brokerRecord = await db.query.broker.findFirst({
      where: eq(broker.id, id),
      with: {
        candidates: {
          with: {
            generatedCVs: true
          }
        }
      }
    });

    if (!brokerRecord) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    let updatedCount = 0;
    for (const cand of brokerRecord.candidates) {
      const existingCv = cand.generatedCVs?.[0];
      if (existingCv) {
        await db.update(generatedCV)
          .set({ templateId })
          .where(eq(generatedCV.id, existingCv.id));
      } else {
        await db.insert(generatedCV).values({
          candidateId: cand.id,
          templateId,
          facePhotoUrl: cand.facePhotoUrl,
          fullBodyPhotoUrl: cand.fullBodyPhotoUrl
        });
      }
      updatedCount++;
    }

    console.log(`[BROKER-TEMPLATE] Updated ${updatedCount} candidates of broker "${brokerRecord.name}" to template "${templateId}"`);

    res.json({
      success: true,
      updatedCount,
      message: `Successfully updated ${updatedCount} candidate(s) to template "${templateId.toUpperCase()}"`
    });
  } catch (error: any) {
    console.error('Failed to change broker templates:', error);
    res.status(500).json({ error: error.message || 'Failed to change broker templates' });
  }
});

export default router;
