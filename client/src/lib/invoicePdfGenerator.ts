import jsPDF from 'jspdf';
import { numberToWords } from './numberToWords';

interface InvoiceCandidate {
  name: string;
  passportNumber: string;
  deployedDate: string;
  price: number;
}

async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`[INVOICE-PDF] Failed to load image from ${url}:`, err);
    return '';
  }
}

export async function generateInvoicePdf(
  candidates: InvoiceCandidate[],
  templateFullName: string,
  invoiceNumber: string,
  userAgency?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 10;
  const marginR = 10;
  const contentW = pageW - marginL - marginR;

  // Load signature & stamp images from public folder
  const [signatureImg, stampImg] = await Promise.all([
    loadImageAsBase64('/sign.png'),
    loadImageAsBase64('/stamp.png'),
  ]);

  // ── Header Heading Text ──
  const isFenero = (userAgency || '').toLowerCase().includes('fenero');
  const agencyHeadingText = isFenero
    ? 'FENERO Foreign Employment Agency'
    : 'SKY Foreign Employment Agency';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(agencyHeadingText, marginL, 18);

  let y = 28;

  // ── DATE line (right-aligned) ──
  const today = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`DATE:${dateStr}`, pageW - marginR, y, { align: 'right' });

  y += 6;

  // ── TO line ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TO ${templateFullName} INVOICE`, marginL, y);

  y += 8;

  // ── Table ──
  // Column definitions [x, width, header, align]
  const colDefs: { x: number; w: number; header: string; align: 'left' | 'center' | 'right' }[] = [
    { x: marginL, w: 10, header: 'NO', align: 'center' },
    { x: marginL + 10, w: 52, header: 'PARTICULARS', align: 'left' },
    { x: marginL + 62, w: 30, header: 'PASSPORT NO', align: 'left' },
    { x: marginL + 92, w: 26, header: 'STATUS', align: 'center' },
    { x: marginL + 118, w: 30, header: 'DATE', align: 'center' },
    { x: marginL + 148, w: contentW - 148, header: 'AMOUNT(USD)', align: 'right' },
  ];

  const rowH = 6.5;
  const headerRowH = 7;

  // Invoice number row (above the column headers)
  doc.setFillColor(220, 225, 240);
  doc.rect(marginL, y, contentW, headerRowH, 'FD');
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(marginL, y, contentW, headerRowH, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`INVOICE NO ${invoiceNumber}`, marginL + 2, y + 5);
  doc.text('INVOICE NO', pageW - marginR - 2, y + 5, { align: 'right' });

  y += headerRowH;

  // Column header row
  doc.setFillColor(220, 225, 240);
  doc.rect(marginL, y, contentW, headerRowH, 'FD');
  doc.rect(marginL, y, contentW, headerRowH, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  for (const col of colDefs) {
    const textX = col.align === 'right' ? col.x + col.w - 2 :
      col.align === 'center' ? col.x + col.w / 2 : col.x + 2;
    doc.text(col.header, textX, y + 5, { align: col.align });
    // Draw column border
    doc.line(col.x, y, col.x, y + headerRowH);
  }
  // Right border
  doc.line(marginL + contentW, y, marginL + contentW, y + headerRowH);

  y += headerRowH;

  // ── Data Rows ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  let total = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    total += c.price;

    // Check if we need a new page (leave room for total + signature = ~50mm)
    if (y + rowH > 260) {
      doc.addPage();
      y = 15;
    }

    // Row background (alternate)
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 255);
      doc.rect(marginL, y, contentW, rowH, 'F');
    }

    // Row border
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(marginL, y, contentW, rowH, 'S');

    // Cell data
    const rowData = [
      String(i + 1),
      c.name.toUpperCase(),
      c.passportNumber,
      'DEPLOYED',
      c.deployedDate,
      String(c.price),
    ];

    for (let j = 0; j < colDefs.length; j++) {
      const col = colDefs[j];
      const textX = col.align === 'right' ? col.x + col.w - 2 :
        col.align === 'center' ? col.x + col.w / 2 : col.x + 2;

      // Truncate long names
      let cellText = rowData[j];
      if (j === 1 && cellText.length > 28) {
        cellText = cellText.substring(0, 26) + '..';
      }

      doc.text(cellText, textX, y + 4.5, { align: col.align });
      // Column separator
      doc.line(col.x, y, col.x, y + rowH);
    }
    doc.line(marginL + contentW, y, marginL + contentW, y + rowH);

    y += rowH;
  }

  // ── Total Row ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(220, 225, 240);
  doc.rect(marginL, y, contentW, rowH + 1, 'FD');
  doc.rect(marginL, y, contentW, rowH + 1, 'S');

  // Total label spans across columns
  const totalLabelX = colDefs[4].x + colDefs[4].w / 2;
  doc.text('', totalLabelX, y + 5, { align: 'center' });

  // Total value
  const totalAmountX = colDefs[5].x + colDefs[5].w - 2;
  doc.text(`${total.toLocaleString()}`, totalAmountX, y + 5, { align: 'right' });

  y += rowH + 1;

  // ── Amount in Words Row ──
  const wordsText = `AMOUNT IN WORDS: - ${numberToWords(total)}`;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.rect(marginL, y, contentW, rowH + 1, 'S');
  doc.text(wordsText, marginL + 2, y + 5);

  // Total label on the right side of amount row
  doc.text(`${total.toLocaleString()} USD`, totalAmountX, y + 5, { align: 'right' });

  y += rowH + 5;

  // ── Signature & Stamp Section ──
  // Check if we need a new page for signature & stamp (needs ~45mm)
  if (y + 45 > 280) {
    doc.addPage();
    y = 20;
  }

  const sectionTopY = y;

  // Signature (left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SIGNATURE', marginL, sectionTopY);

  const sigW = 32;
  const sigH = 22; // Natural aspect ratio for sign.png (1635x1121 -> 1.458:1)
  if (signatureImg) {
    doc.addImage(signatureImg, 'PNG', marginL, sectionTopY + 4, sigW, sigH);
  }

  const textY = sectionTopY + 4 + sigH + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('G. MANAGER IBRAHIM ABDURAHMAN', marginL, textY);

  // Stamp (right side, aligned with signature section)
  const stampW = 34;
  const stampH = 32.5; // Natural aspect ratio for stamp.png (1623x1550 -> 1.047:1)
  const stampX = pageW - marginR - stampW;
  const stampY = sectionTopY + 4;

  doc.text('STAMP', stampX + stampW / 2, sectionTopY, { align: 'center' });
  if (stampImg) {
    doc.addImage(stampImg, 'PNG', stampX, stampY, stampW, stampH);
  }

  // ── Download ──
  const agencyFilePrefix = isFenero ? 'FENERO_INVOICE' : 'SKY_INVOICE';
  const fileName = `${agencyFilePrefix}_${invoiceNumber}_${dateStr.replace(/ /g, '_')}.pdf`;
  doc.save(fileName);
}
