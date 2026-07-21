import { Router, Request, Response } from 'express';
import { db } from '../db';
import { invoice, candidate, generatedCV, templatePrice } from '../db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';

const router = Router();

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = (session?.user as any)?.majorAgency || 'Sky';

    // MySQL 5.7 compatible — join candidate table to filter by user's agency
    const rows = await db.select({
      invoice: invoice,
      candidate: candidate
    })
    .from(invoice)
    .innerJoin(candidate, eq(invoice.candidateId, candidate.id))
    .where(eq(candidate.majorAgency, userAgency))
    .orderBy(desc(invoice.createdAt));

    if (rows.length === 0) return res.json([]);

    const candidateIds = rows.map(r => r.candidate.id);

    // Batch fetch generatedCVs (only templateId needed)
    const cvs = candidateIds.length > 0
      ? await db.select({ candidateId: generatedCV.candidateId, templateId: generatedCV.templateId })
          .from(generatedCV).where(inArray(generatedCV.candidateId, candidateIds))
      : [];

    const cvsMap = new Map<string, { templateId: string }[]>();
    for (const cv of cvs) {
      if (!cvsMap.has(cv.candidateId)) cvsMap.set(cv.candidateId, []);
      cvsMap.get(cv.candidateId)!.push({ templateId: cv.templateId });
    }

    const result = rows.map(r => ({
      ...r.invoice,
      candidate: {
        ...r.candidate,
        generatedCVs: cvsMap.get(r.candidate.id) || []
      }
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', message: error.message });
  }
});

// POST /api/invoices
router.post('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = (session?.user as any)?.majorAgency || 'Sky';
    const { candidateId, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;

    if (!candidateId || !lmisQrCodeUrl || !insuranceUrl || !ticketUrl) {
      return res.status(400).json({ error: 'Missing required invoice fields' });
    }

    const cand = await db.query.candidate.findFirst({
      where: and(eq(candidate.id, candidateId), eq(candidate.majorAgency, userAgency))
    });

    if (!cand) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Determine price based on the most recent generated CV template for this candidate
    let price = "0";
    try {
      const cvs = await db.query.generatedCV.findMany({
        where: eq(generatedCV.candidateId, candidateId),
        orderBy: (gc, { desc }) => [desc(gc.createdAt)],
        limit: 1
      });
      if (cvs.length > 0) {
        const latestTemplate = cvs[0].templateId;
        const prices = await db.query.templatePrice.findFirst({
          where: eq(templatePrice.templateId, latestTemplate)
        });
        if (prices) {
          price = prices.price;
        }
      }
    } catch (_) { /* ignore if no table or no CVs */ }

    // Upload files
    const [lmisPath, insurancePath, ticketPath] = await Promise.all([
      uploadToLocal(lmisQrCodeUrl, 'invoices/lmis'),
      uploadToLocal(insuranceUrl, 'invoices/insurance'),
      uploadToLocal(ticketUrl, 'invoices/ticket'),
    ]);

    const id = `inv_${Math.random().toString(36).substring(2, 11)}`;
    const finalDeployedDate = deployedDate ? new Date(deployedDate) : null;

    await db.insert(invoice).values({
      id,
      candidateId,
      lmisQrCodeUrl: lmisPath || '',
      insuranceUrl: insurancePath || '',
      ticketUrl: ticketPath || '',
      price,
      isDelivered: false,
      deployedDate: finalDeployedDate
    });

    const created = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });
    
    return res.status(201).json(created);
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ 
      error: 'Failed to save invoice', 
      message: error.message || 'Unknown error',
    });
  }
});

// PATCH /api/invoices/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = (session?.user as any)?.majorAgency || 'Sky';
    const { id } = req.params;
    const { isDelivered, isDownloaded } = req.body;

    const existingInvoice = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const candCheck = await db.query.candidate.findFirst({
      where: and(eq(candidate.id, existingInvoice.candidateId), eq(candidate.majorAgency, userAgency))
    });
    if (!candCheck) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updateData: any = {};
    if (isDelivered !== undefined) {
      if (typeof isDelivered !== 'boolean') {
        return res.status(400).json({ error: 'isDelivered must be a boolean' });
      }
      updateData.isDelivered = isDelivered;
      updateData.deployedDate = isDelivered ? new Date() : null;
    }

    if (isDownloaded !== undefined) {
      if (typeof isDownloaded !== 'boolean') {
        return res.status(400).json({ error: 'isDownloaded must be a boolean' });
      }
      updateData.isDownloaded = isDownloaded;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(invoice)
        .set(updateData)
        .where(eq(invoice.id, id));
    }

    // Fetch the updated invoice with candidate data (MySQL 5.7 compatible)
    const [updatedInv] = await db.select().from(invoice).where(eq(invoice.id, id)).limit(1);
    let candidateData = null;
    if (updatedInv?.candidateId) {
      const [cand] = await db.select().from(candidate).where(eq(candidate.id, updatedInv.candidateId)).limit(1);
      candidateData = cand || null;
    }

    return res.json({ ...updatedInv, candidate: candidateData });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = (session?.user as any)?.majorAgency || 'Sky';
    const { id } = req.params;
    const { price, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;

    const existingInvoice = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const candCheck = await db.query.candidate.findFirst({
      where: and(eq(candidate.id, existingInvoice.candidateId), eq(candidate.majorAgency, userAgency))
    });
    if (!candCheck) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    let updatedPrice = price;
    if (!updatedPrice) {
      updatedPrice = existingInvoice.price;
    }

    // Process new file uploads if passed as base64
    let lmisPath = lmisQrCodeUrl;
    let insurancePath = insuranceUrl;
    let ticketPath = ticketUrl;

    const uploadPromises = [];
    if (lmisQrCodeUrl && lmisQrCodeUrl.startsWith('data:')) {
      uploadPromises.push(
        uploadToLocal(lmisQrCodeUrl, 'invoices/lmis').then(p => { if (p) lmisPath = p; })
      );
    }
    if (insuranceUrl && insuranceUrl.startsWith('data:')) {
      uploadPromises.push(
        uploadToLocal(insuranceUrl, 'invoices/insurance').then(p => { if (p) insurancePath = p; })
      );
    }
    if (ticketUrl && ticketUrl.startsWith('data:')) {
      uploadPromises.push(
        uploadToLocal(ticketUrl, 'invoices/ticket').then(p => { if (p) ticketPath = p; })
      );
    }

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const finalDeployedDate = deployedDate !== undefined ? (deployedDate ? new Date(deployedDate) : null) : undefined;

    const updateData: any = {
      price: updatedPrice || '0',
      lmisQrCodeUrl: lmisPath || '',
      insuranceUrl: insurancePath || '',
      ticketUrl: ticketPath || '',
    };
    if (finalDeployedDate !== undefined) {
      updateData.deployedDate = finalDeployedDate;
    }

    await db.update(invoice)
      .set(updateData)
      .where(eq(invoice.id, id));

    // Fetch the updated invoice with candidate data (MySQL 5.7 compatible)
    const [updatedInv] = await db.select().from(invoice).where(eq(invoice.id, id)).limit(1);
    let candidateData = null;
    if (updatedInv?.candidateId) {
      const [cand] = await db.select().from(candidate).where(eq(candidate.id, updatedInv.candidateId)).limit(1);
      candidateData = cand || null;
    }

    return res.json({ ...updatedInv, candidate: candidateData });
  } catch (error: any) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const userAgency = (session?.user as any)?.majorAgency || 'Sky';
    const { id } = req.params;
    
    const existing = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const candCheck = await db.query.candidate.findFirst({
      where: and(eq(candidate.id, existing.candidateId), eq(candidate.majorAgency, userAgency))
    });
    if (!candCheck) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await db.delete(invoice).where(eq(invoice.id, id));
    
    return res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice', message: error.message });
  }
});

export default router;
