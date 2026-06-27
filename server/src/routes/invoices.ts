import { Router, Request, Response } from 'express';
import { db } from '../db';
import { invoice, candidate, generatedCV, templatePrice } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';

const router = Router();

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const invoices = await db.query.invoice.findMany({
      with: {
        candidate: {
          with: {
            generatedCVs: {
              columns: { templateId: true }
            }
          }
        }
      },
      orderBy: (i, { desc }) => [desc(i.createdAt)]
    });
    
    res.json(invoices);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', message: error.message });
  }
});

// POST /api/invoices
router.post('/', async (req: Request, res: Response) => {
  try {
    const { candidateId, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;

    if (!candidateId || !lmisQrCodeUrl || !insuranceUrl || !ticketUrl) {
      return res.status(400).json({ error: 'Missing required invoice fields' });
    }

    const cand = await db.query.candidate.findFirst({
      where: eq(candidate.id, candidateId)
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
    const { id } = req.params;
    const { isDelivered } = req.body;

    if (typeof isDelivered !== 'boolean') {
      return res.status(400).json({ error: 'isDelivered must be a boolean' });
    }

    const existingInvoice = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const deployedDate = isDelivered ? new Date() : null;

    await db.update(invoice)
      .set({ isDelivered, deployedDate })
      .where(eq(invoice.id, id));

    const updated = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;

    const existingInvoice = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });

    if (!existingInvoice) {
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

    // Fetch the updated invoice with candidate relation
    const updated = await db.query.invoice.findFirst({
      where: eq(invoice.id, id),
      with: {
        candidate: true
      }
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });
    if (!existing) {
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
