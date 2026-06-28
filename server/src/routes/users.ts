import { Router, Request, Response } from 'express';
import { db } from '../db';
import { user, candidate, quickRegistration } from '../db/schema';
import { eq, desc, isNotNull, sql } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { authenticateSession, requireSuperAdmin } from '../middlewares/auth';

const router = Router();

// Ensure session authentication is applied globally to user management
router.use(authenticateSession);

// GET /api/users/analytics
router.get('/analytics', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }).from(user);

    const candidateCountMap: Record<string, number> = {};
    try {
      const candidateCounts = await db.select({
        registeredById: candidate.registeredById,
        count: sql<number>`count(*)`
      })
      .from(candidate)
      .where(isNotNull(candidate.registeredById))
      .groupBy(candidate.registeredById);

      candidateCounts.forEach((c) => {
        if (c.registeredById) {
          candidateCountMap[c.registeredById] = Number(c.count);
        }
      });
    } catch (e: any) {
      console.error('[ANALYTICS] Failed to fetch candidate counts:', e);
    }

    const quickCountMap: Record<string, number> = {};
    try {
      const quickRegistrationCounts = await db.select({
        registeredById: quickRegistration.registeredById,
        count: sql<number>`count(*)`
      })
      .from(quickRegistration)
      .where(isNotNull(quickRegistration.registeredById))
      .groupBy(quickRegistration.registeredById);

      quickRegistrationCounts.forEach((q) => {
        if (q.registeredById) {
          quickCountMap[q.registeredById] = Number(q.count);
        }
      });
    } catch (e: any) {
      console.error('[ANALYTICS] Failed to fetch quick registration counts:', e);
    }

    const analyticsData = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      candidatesRegistered: candidateCountMap[u.id] || 0,
      quickRegistrations: quickCountMap[u.id] || 0,
    }));

    res.json(analyticsData);
  } catch (error: any) {
    console.error('Failed to fetch user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics: ' + error.message });
  }
});

// GET /api/users
router.get('/', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agency: user.agency,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));
    
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, agency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'genaral', 'calling'];
    const assignedRole = VALID_ROLES.includes(role) ? role : 'user';

    // Use Better Auth's sign-up API
    const authRes: any = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    let userId = authRes?.user?.id;
    if (!userId) {
      try {
        const dbUser = await db.query.user.findFirst({
          where: eq(user.email, email),
          columns: { id: true }
        });
        userId = dbUser?.id;
      } catch (e) {
        console.warn('[USERS] db query failed to resolve userId:', e);
      }
    }

    if (!userId) {
      return res.status(500).json({ error: 'Failed to resolve user ID after signup' });
    }

    await db.update(user)
      .set({ 
        role: assignedRole,
        agency: assignedRole === 'agency' ? agency : null
      })
      .where(eq(user.id, userId));

    res.status(201).json({ success: true, userId });
  } catch (err: any) {
    console.error('[USERS] Failed to create user:', err);
    res.status(400).json({ error: err.message || err.error || String(err) });
  }
});

// PATCH /api/users/:id
router.patch('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, agency } = req.body;

    const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'genaral', 'calling'];
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updateData: any = {};
    if (role) {
      updateData.role = role;
      if (role !== 'agency') {
        updateData.agency = null;
      }
    }
    if (agency !== undefined) {
      updateData.agency = agency;
    }

    await db.update(user)
      .set(updateData)
      .where(eq(user.id, id));

    // Fetch the updated user
    const updated = await db.query.user.findFirst({
      where: eq(user.id, id)
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(user).where(eq(user.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
