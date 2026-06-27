import { Router, Request, Response } from 'express';
import { db } from '../db';
import { candidate } from '../db/schema';
import { or, like } from 'drizzle-orm';

const router = Router();

// GET /api/search
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);

    const candidatesList = await db.select()
      .from(candidate)
      .where(
        or(
          like(candidate.givenNames, `%${query}%`),
          like(candidate.surname, `%${query}%`),
          like(candidate.passportNumber, `%${query}%`),
          like(candidate.idNumber, `%${query}%`)
        )
      )
      .limit(10);

    res.json(candidatesList);
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
