import { Router, Request, Response } from 'express';
import { db } from '../db';
import { leader, broker, candidate } from '../db/schema';
import { asc, eq, isNotNull, sql } from 'drizzle-orm';

const router = Router();

// GET /api/leaders
router.get('/', async (req: Request, res: Response) => {
  try {
    // 1. Fetch all leaders
    const leaders = await db.select({
      id: leader.id,
      name: leader.name,
      createdAt: leader.createdAt
    }).from(leader).orderBy(asc(leader.name));

    // 2. Fetch all brokers
    const brokers = await db.select({
      id: broker.id,
      name: broker.name,
      leaderId: broker.leaderId,
      isLocked: broker.isLocked,
      createdAt: broker.createdAt
    }).from(broker).orderBy(asc(broker.name));

    // 3. Fetch candidate counts per broker
    const countRows = await db.select({
      brokerId: candidate.brokerId,
      count: sql<number>`count(*)`
    })
    .from(candidate)
    .where(isNotNull(candidate.brokerId))
    .groupBy(candidate.brokerId);

    const countMap: Record<string, number> = {};
    countRows.forEach(row => {
      if (row.brokerId) {
        countMap[row.brokerId] = Number(row.count);
      }
    });

    // 4. Augment and group brokers in memory
    const augmented = leaders.map((lead: any) => {
      const leaderBrokers = brokers
        .filter((b: any) => b.leaderId === lead.id)
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          leaderId: b.leaderId,
          isLocked: b.isLocked,
          createdAt: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt.toISOString(),
          _count: {
            candidates: countMap[b.id] || 0
          }
        }));

      const totalCandidates = leaderBrokers.reduce(
        (sum: number, b: any) => sum + b._count.candidates,
        0
      );

      return {
        id: lead.id,
        name: lead.name,
        createdAt: typeof lead.createdAt === 'string' ? lead.createdAt : lead.createdAt.toISOString(),
        brokers: leaderBrokers,
        _count: {
          brokers: leaderBrokers.length
        },
        totalCandidates
      };
    });

    res.json(augmented);
  } catch (error: any) {
    console.error('Error fetching leaders via Drizzle:', error);
    res.status(500).json({
      error: 'Failed to fetch leaders',
      message: error?.message || String(error)
    });
  }
});

// POST /api/leaders
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Leader name is required' });
    }

    // Generate CUID-like ID manually: cl + 23 alphanumeric characters = 25 chars
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 23; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const id = 'cl' + randomPart;

    // Insert leader
    await db.insert(leader).values({
      id,
      name: name.trim()
    });

    // Fetch back the created record
    const createdLeader = await db.query.leader.findFirst({
      where: eq(leader.id, id)
    });

    if (!createdLeader) {
      throw new Error('Failed to retrieve newly created leader');
    }

    res.json({
      id: createdLeader.id,
      name: createdLeader.name,
      createdAt: typeof createdLeader.createdAt === 'string' ? createdLeader.createdAt : createdLeader.createdAt.toISOString(),
      brokers: [],
      _count: { brokers: 0 },
      totalCandidates: 0
    });
  } catch (error: any) {
    console.error('Error creating leader via Drizzle:', error);
    if (error.message?.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A leader with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create leader' });
  }
});

// PATCH /api/leaders/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Leader name is required' });
    }

    // Check if leader exists
    const leadRecord = await db.query.leader.findFirst({
      where: eq(leader.id, id)
    });
    if (!leadRecord) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    // Update name
    await db.update(leader)
      .set({ name: name.trim() })
      .where(eq(leader.id, id));

    res.json({ success: true, message: 'Leader name updated successfully' });
  } catch (error: any) {
    console.error('Failed to update leader name via Drizzle:', error);
    if (error.message?.includes('Duplicate entry') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A leader with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update leader' });
  }
});

// DELETE /api/leaders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if leader exists
    const leadRecord = await db.query.leader.findFirst({
      where: eq(leader.id, id)
    });

    if (!leadRecord) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    // Set leaderId = null for all brokers under this leader
    await db.update(broker)
      .set({ leaderId: null })
      .where(eq(broker.leaderId, id));

    // Delete leader
    await db.delete(leader)
      .where(eq(leader.id, id));

    res.json({ success: true, message: `Leader "${leadRecord.name}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete leader via Drizzle:', error);
    res.status(500).json({ error: error.message || 'Failed to delete leader' });
  }
});

export default router;
