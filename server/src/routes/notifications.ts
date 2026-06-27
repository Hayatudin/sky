import { Router, Request, Response } from 'express';
import { db } from '../db';
import { notification } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await db.select()
      .from(notification)
      .orderBy(desc(notification.createdAt))
      .limit(50);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications
router.patch('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    if (body.markAllRead) {
      await db.update(notification)
        .set({ isRead: true })
        .where(eq(notification.isRead, false));
      return res.json({ success: true });
    }

    if (body.id) {
      await db.update(notification)
        .set({ isRead: true })
        .where(eq(notification.id, body.id));
      
      const updated = await db.query.notification.findFirst({
        where: eq(notification.id, body.id)
      });
      return res.json(updated);
    }

    res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
