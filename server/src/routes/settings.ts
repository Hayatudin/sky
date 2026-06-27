import { Router, Request, Response } from 'express';
import { db } from '../db';
import { templatePrice } from '../db/schema';

const router = Router();

// GET /api/settings/prices
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const rawRows = await db.select().from(templatePrice);
    res.json(rawRows);
  } catch (error) {
    // If table doesn't exist yet, return empty array
    res.json([]);
  }
});

// POST /api/settings/prices
router.post('/prices', async (req: Request, res: Response) => {
  try {
    const { prices } = req.body; // Expecting { prices: { templateId: 'price', ... } }

    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ error: 'Invalid prices payload' });
    }

    for (const [templateId, price] of Object.entries(prices)) {
      if (typeof price !== 'string' && typeof price !== 'number') continue;
      const formattedPrice = String(price).trim();
      
      // Upsert logic using Drizzle's onDuplicateKeyUpdate
      await db.insert(templatePrice)
        .values({
          templateId,
          price: formattedPrice,
        })
        .onDuplicateKeyUpdate({
          set: {
            price: formattedPrice,
          }
        });
    }

    res.json({ success: true, message: 'Prices updated successfully' });
  } catch (error: any) {
    console.error('Failed to update template prices:', error);
    res.status(500).json({ error: error.message || 'Failed to update prices' });
  }
});

export default router;
