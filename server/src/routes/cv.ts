import { Router, Request, Response } from 'express';
import { db } from '../db';
import { candidate, generatedCV } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
const ImageModule = require('docxtemplater-image-module-free');
import JSZip from 'jszip';
import crypto from 'crypto';
import QRCode from 'qrcode';
// playwright is NOT imported at the top — it is loaded lazily only when PDF/image
// format is requested, so the server starts even without playwright installed.

const router = Router();

interface BulkJob {
  progress: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  zipBuffer?: Buffer;
  error?: string;
  expiresAt: number;
}

const bulkJobs: Record<string, BulkJob> = {};

// Clean up expired jobs (older than 15 minutes) every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of Object.entries(bulkJobs)) {
    if (now > job.expiresAt) {
      delete bulkJobs[jobId];
      console.log(`[Bulk CV] Cleaned up expired job: ${jobId}`);
    }
  }
}, 5 * 60 * 1000);

const fetchImageAsBase64 = async (url: string) => {
  if (!url) return '';

  // If it's already a base64 data URL, just strip the prefix
  if (url.startsWith('data:')) {
    return url.split(',')[1] || url;
  }

  // Try local file system first
  try {
    let cleanUrl = url.startsWith('http') ? new URL(url).pathname : url;

    if (cleanUrl.includes('/api/assets/')) {
      cleanUrl = cleanUrl.split('/api/assets/')[1];
    }

    const relativePath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;

    const pathsToTry = [
      path.join(process.cwd(), 'public', relativePath),
      path.join(process.cwd(), relativePath),
      path.join(process.cwd(), '..', 'public', relativePath),
      path.join(process.cwd(), 'public', 'uploads', relativePath),
    ];

    for (const localPath of pathsToTry) {
      if (fs.existsSync(localPath)) {
        console.log(`[DOCX] Found local image at: ${localPath}`);
        return fs.readFileSync(localPath, 'base64');
      }
    }
  } catch (e) {
    console.warn(`[DOCX] Local read failed for: ${url}`, e);
  }

  // Fallback to remote fetch
  if (url.startsWith('http')) {
    try {
      console.log(`[DOCX] Fetching remote image: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }
    } catch (e) {
      console.warn(`[DOCX] Remote fetch failed: ${url}`);
    }
  }

  return '';
};

const calculateAge = (dob: Date | null | undefined) => {
  if (!dob) return '';
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
};

const TEMPLATE_MAP: Record<string, string> = {
  'tmpl-rawasi': 'CV ALM.docx',
  'tmpl-azm': 'CV ALM.docx',
  'tmpl-mazaya': 'CV MA.docx',
};

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { candidateId, templateId, format, facePhoto, fullBodyPhoto } = req.body;

    if (!candidateId || !templateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cand = await db.query.candidate.findFirst({
      where: eq(candidate.id, candidateId)
    });

    if (!cand) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (cand.isLocked) {
      return res.status(403).json({ error: 'This candidate is locked. CV downloading is restricted.' });
    }

    const templateRef = TEMPLATE_MAP[templateId];
    if (!templateRef) {
      return res.status(400).json({ error: `Invalid template ID: ${templateId}` });
    }

    // PDF / Image formatting (lazy playwright load — not available on cPanel)
    if (format === 'pdf' || format === 'image' || format === 'jpg') {
      let playwrightChromium: any;
      try {
        playwrightChromium = require('playwright').chromium;
      } catch {
        return res.status(501).json({ error: 'PDF/image generation is not available on this server (playwright not installed). Use DOCX format instead.' });
      }
      const browser = await playwrightChromium.launch({ headless: true, args: ['--no-sandbox'] });
      try {
        const page = await browser.newPage();
        const clientTemplateRoute = (templateRef === 'CV Al-shablan.docx' ? 'al-shablan' : (templateRef === 'CV Ussus.docx' ? 'ussus' : templateRef));
        const printUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/cv-print/${candidateId}/${clientTemplateRoute}`;
        console.log('Generating from URL:', printUrl);

        await page.goto(printUrl, { waitUntil: 'networkidle' });

        let outputBuf: Buffer;
        let contentType: string;
        let extension: string;

        if (format === 'pdf') {
          outputBuf = await page.pdf({ format: 'A4', printBackground: true });
          contentType = 'application/pdf';
          extension = 'pdf';
        } else {
          outputBuf = await page.screenshot({ type: 'jpeg', fullPage: true });
          contentType = 'image/jpeg';
          extension = 'jpg';
        }

        await browser.close();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="CV_${cand.surname}.${extension}"`);
        return res.send(outputBuf);
      } catch (err: any) {
        await browser.close();
        throw err;
      }
    }

    // DOCX formatting (docxtemplater logic)
    if (format === 'doc' || format === 'docx') {
      const templatePath = path.join(process.cwd(), 'templates', templateRef);
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: `Template file not found: ${templateRef}` });
      }

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);

      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        let docXml = docXmlFile.asText();
        docXml = docXml.replace(/<w:highlight[^>]*\/>/g, ''); // Clear highlights if any

        let isAlmFullBodyInjected = false;
        if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
          docXml = docXml.replace(
            /(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/,
            '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>'
          );
          isAlmFullBodyInjected = true;
        }

        if (!docXml.includes('fullBodyPhoto') && !isAlmFullBodyInjected) {
          const fullBodyInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%fullBodyPhoto}</w:t></w:r></w:p>`;
          docXml = docXml.replace('</w:body>', fullBodyInjection + '</w:body>');
        }

        if (templateId !== 'tmpl-ussus' && !docXml.includes('passport image') && !docXml.includes('passportPhoto')) {
          const passportInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%passport image}</w:t></w:r></w:p>`;
          docXml = docXml.replace('</w:body>', passportInjection + '</w:body>');
        }

        zip.file('word/document.xml', docXml);
      }

      const sizeOf = require('image-size');
      const imageOptions = {
        centered: true,
        getImage: (tagValue: string) => {
          if (!tagValue) return Buffer.from('');
          const base64Data = tagValue.split(',')[1] || tagValue;
          return Buffer.from(base64Data, 'base64');
        },
        getSize: (img: Buffer, tagValue: string, tagName: string) => {
          if (tagName === 'qrCode') return [100, 100];

          let maxWidth = 150;
          let maxHeight = 180;

          if (tagName === 'facePhoto' || tagName === 'photo') {
            if (templateId === 'tmpl-ussus') {
              maxWidth = 220; maxHeight = 270;
            } else if (templateId === 'tmpl-al-shablan') {
              maxWidth = 150; maxHeight = 165;
            } else {
              maxWidth = 150; maxHeight = 180;
            }
          } else if (tagName === 'fullBodyPhoto') {
            if (templateId === 'tmpl-ussus') {
              maxWidth = 250; maxHeight = 500;
            } else if (templateId === 'tmpl-al-shablan') {
              maxWidth = 240; maxHeight = 600;
            } else {
              maxWidth = 320; maxHeight = 580;
            }
          } else if (tagName === 'passport image' || tagName === 'passportPhoto') {
            maxWidth = 550;
            maxHeight = 750;
          }

          try {
            const dimensions = sizeOf(img);
            console.log(`[DOCX] Image ${tagName} original size: ${dimensions.width}x${dimensions.height}`);
            const ratio = dimensions.width / dimensions.height;

            if (ratio > maxWidth / maxHeight) {
              return [maxWidth, Math.round(maxWidth / ratio)];
            } else {
              return [Math.round(maxHeight * ratio), maxHeight];
            }
          } catch (e) {
            console.warn(`[DOCX] Failed to get dimensions for ${tagName}`, e);
            return [maxWidth, maxHeight];
          }
        },
      };

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOptions)],
      });

      const skillsArray = Array.isArray(cand.skills) ? cand.skills.map(String) : [];
      const langsArray = Array.isArray(cand.languages) ? cand.languages.map(String) : [];
      const isExperienced = Array.isArray(cand.workExperience) && (cand.workExperience as any[]).some((e: any) => e.experienceStatus === 'Have experience');
      const hasSkill = (keyword: string) => {
        const kw = keyword.toLowerCase();
        if (kw.includes('cook') || kw.includes('arabic')) {
          return isExperienced ? 'Yes' : 'No';
        }
        if (kw.includes('iron')) {
          return isExperienced ? (skillsArray.some((s: string) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No') : 'No';
        }
        if (kw.includes('clean') || kw.includes('wash') || kw.includes('baby') || kw.includes('child')) {
          return 'Yes';
        }
        return skillsArray.some((s: string) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No';
      };
      const hasLang = (keyword: string) => langsArray.some((l: string) => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';

      const [facePhotoData, fullBodyPhotoData, passportPhotoData] = await Promise.all([
        fetchImageAsBase64(facePhoto || cand.passportImageUrl || ''),
        fetchImageAsBase64(fullBodyPhoto || cand.fullBodyPhotoUrl || ''),
        fetchImageAsBase64(cand.passportImageUrl || '')
      ]);
      const finalVideoUrl = cand.videoUrl;
      const qrCodeData = finalVideoUrl ? await QRCode.toDataURL(finalVideoUrl) : '';

      const formatValue = (val: any) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '' ? val : '-');

      const data = {
        refNumber: cand.id.slice(-6).toUpperCase(),
        givenNames: formatValue(cand.givenNames),
        surname: formatValue(cand.surname),
        fullName: `${formatValue(cand.givenNames)} ${formatValue(cand.surname)}`.replace(/-/g, '').trim() || '-',
        passportNumber: formatValue(cand.passportNumber),
        dateOfBirth: cand.dateOfBirth ? cand.dateOfBirth.toISOString().split('T')[0] : '-',
        dob: cand.dateOfBirth ? cand.dateOfBirth.toISOString().split('T')[0] : '-',
        gender: formatValue(cand.gender),
        nationality: formatValue(cand.nationality),
        issuingCountry: formatValue(cand.issuingCountry),
        dateOfIssue: cand.dateOfIssue ? cand.dateOfIssue.toISOString().split('T')[0] : '-',
        issueDate: cand.dateOfIssue ? cand.dateOfIssue.toISOString().split('T')[0] : '-',
        dateOfExpiry: cand.dateOfExpiry ? cand.dateOfExpiry.toISOString().split('T')[0] : '-',
        expiryDate: cand.dateOfExpiry ? cand.dateOfExpiry.toISOString().split('T')[0] : '-',
        issuePlace: formatValue(cand.issuingCountry),
        maritalStatus: formatValue(cand.maritalStatus),
        numberOfChildren: cand.numberOfChildren || 0,
        religion: formatValue(cand.religion),
        bloodType: formatValue(cand.bloodType),
        height: formatValue(cand.height),
        weight: formatValue(cand.weight),
        phone: formatValue(cand.phone),
        email: formatValue(cand.email),
        address: formatValue(cand.city),
        city: formatValue(cand.city),
        state: formatValue(cand.state),
        country: formatValue(cand.country),
        educationLevel: formatValue(cand.educationLevel),
        languages: langsArray.join(', ') || '-',
        workExperience: formatValue(cand.workExperience),
        skills: skillsArray.join(', ') || '-',
        medicalStatus: formatValue(cand.medicalStatus),
        knownConditions: formatValue(cand.knownConditions),
        emergencyName: formatValue(cand.emergencyContactName),
        emergencyPhone: formatValue(cand.emergencyContactPhone),
        job: formatValue(cand.job),
        age: calculateAge(cand.dateOfBirth),

        skillBaby: formatValue(hasSkill('baby')),
        skillChildren: formatValue(hasSkill('child')),
        skillTutor: formatValue(hasSkill('tutor')),
        skillComputer: formatValue(hasSkill('computer')),
        skillClean: formatValue(hasSkill('clean')),
        skillWash: formatValue(hasSkill('wash')),
        skillIron: formatValue(hasSkill('iron')),
        skillCook: formatValue(hasSkill('cook')),
        skillArabicCook: formatValue(hasSkill('arabic')),
        skillSew: formatValue(hasSkill('sew')),
        skillDrive: formatValue(hasSkill('driv')),
        skillDisabled: formatValue(hasSkill('disabl')),

        english: formatValue(hasLang('english')),
        arabic: formatValue(hasLang('arabic')),

        qrCode: qrCodeData,
        expCountry: '-',
        expPeriod: '-',

        facePhoto: facePhotoData,
        photo: facePhotoData,
        fullBodyPhoto: fullBodyPhotoData,
        passportPhoto: passportPhotoData,
        'passport image': passportPhotoData,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        generatedAt: new Date().toLocaleDateString(),
        FULL_NAME: `${formatValue(cand.givenNames)} ${formatValue(cand.surname)}`.replace(/-/g, '').trim() || '-',
        NAME_AR: 'الاسم الكامل',
        PASSPORT_NO: formatValue(cand.passportNumber),
        DOB: cand.dateOfBirth ? cand.dateOfBirth.toISOString().split('T')[0] : '-',
        NATIONALITY: formatValue(cand.nationality),
        GENDER: formatValue(cand.gender),
        PHONE: formatValue(cand.phone),
        phoneNumber: formatValue(cand.phone),
        HEIGHT: formatValue(cand.height),
        WEIGHT: formatValue(cand.weight),
        EXPERIENCE: formatValue(cand.workExperience),
        workPeriod: formatValue(cand.workExperience ? 'Experienced' : 'Fresher'),
        position: formatValue(cand.job),
        salary: '-',
        SKILLS: skillsArray.join(', ') || '-',
        PLACE_OF_BIRTH: formatValue(cand.placeOfBirth),
        AGE: calculateAge(cand.dateOfBirth),
        expPosition: '-',
      };

      const exps = Array.isArray(cand.workExperience) ? cand.workExperience as any[] : [];
      const validExp = exps.find(e => e.experienceStatus === 'Have experience');
      if (validExp) {
        data.expCountry = validExp.country || '-';
        data.expPeriod = validExp.yearsOfExperience ? `${validExp.yearsOfExperience} YEARS` : '-';
        data.expPosition = validExp.position || cand.job || '-';
      }

      doc.render(data);

      const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="CV_${cand.surname}.docx"`);
      return res.send(docxBuf);
    }

  } catch (error: any) {
    console.error('CV Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate CV' });
  }
});

router.post('/bulk-generate', async (req: Request, res: Response) => {
  try {
    const { candidateIds, format } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0 || !format) {
      return res.status(400).json({ error: 'Missing candidateIds or format' });
    }

    const jobId = crypto.randomUUID();
    bulkJobs[jobId] = {
      progress: 0,
      total: candidateIds.length,
      status: 'pending',
      expiresAt: Date.now() + 15 * 60 * 1000
    };

    res.json({ jobId });

    // Start background processing
    (async () => {
      bulkJobs[jobId].status = 'processing';
      const zip = new JSZip();

      try {
        const dbCandidates = await db.query.candidate.findMany({
          where: inArray(candidate.id, candidateIds),
          with: { generatedCVs: true }
        });

        // Filter out locked candidates directly
        const candidates = dbCandidates.filter(c => !c.isLocked);

        if (format === 'doc' || format === 'docx') {
          const BATCH_SIZE = 20;
          const errors: string[] = [];

          for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (candItem) => {
              try {
                const firstCv = candItem.generatedCVs?.[0];
                const rawTemplateId = firstCv ? firstCv.templateId : 'rawasi';
                const templateId = rawTemplateId.startsWith('tmpl-') ? rawTemplateId : `tmpl-${rawTemplateId}`;

                const templateRef = TEMPLATE_MAP[templateId] || 'CV ALM.docx';
                const templatePath = path.join(process.cwd(), 'templates', templateRef);
                if (!fs.existsSync(templatePath)) {
                  throw new Error(`Template not found: ${templateRef}`);
                }

                const content = fs.readFileSync(templatePath, 'binary');
                const candidateZip = new PizZip(content);

                const docXmlFile = candidateZip.file('word/document.xml');
                if (docXmlFile) {
                  let docXml = docXmlFile.asText();
                  docXml = docXml.replace(/<w:highlight[^>]*\/>/g, ''); // Clear highlights if any

                  let isAlmFullBodyInjected = false;
                  if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
                    docXml = docXml.replace(
                      /(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/,
                      '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>'
                    );
                    isAlmFullBodyInjected = true;
                  }

                  if (!docXml.includes('fullBodyPhoto') && !isAlmFullBodyInjected) {
                    const fullBodyInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%fullBodyPhoto}</w:t></w:r></w:p>`;
                    docXml = docXml.replace('</w:body>', fullBodyInjection + '</w:body>');
                  }

                  if (templateId !== 'tmpl-ussus' && !docXml.includes('passport image') && !docXml.includes('passportPhoto')) {
                    const passportInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%passport image}</w:t></w:r></w:p>`;
                    docXml = docXml.replace('</w:body>', passportInjection + '</w:body>');
                  }

                  candidateZip.file('word/document.xml', docXml);
                }

                const facePhotoUrl = firstCv ? firstCv.facePhotoUrl : candItem.facePhotoUrl;
                const fullBodyPhotoUrl = firstCv ? firstCv.fullBodyPhotoUrl : candItem.fullBodyPhotoUrl;

                const [facePhotoData, fullBodyPhotoData, passportPhotoData] = await Promise.all([
                  fetchImageAsBase64(facePhotoUrl || candItem.passportImageUrl || ''),
                  fetchImageAsBase64(fullBodyPhotoUrl || candItem.fullBodyPhotoUrl || ''),
                  fetchImageAsBase64(candItem.passportImageUrl || '')
                ]);

                const finalVideoUrl = candItem.videoUrl;
                const qrCodeData = finalVideoUrl ? await QRCode.toDataURL(finalVideoUrl) : '';

                const skillsArray = Array.isArray(candItem.skills) ? candItem.skills.map(String) : [];
                const langsArray = Array.isArray(candItem.languages) ? candItem.languages.map(String) : [];
                const isExperienced = Array.isArray(candItem.workExperience) && (candItem.workExperience as any[]).some((e: any) => e.experienceStatus === 'Have experience');
                const hasSkill = (keyword: string) => {
                  const kw = keyword.toLowerCase();
                  if (kw.includes('cook') || kw.includes('arabic')) {
                    return isExperienced ? 'Yes' : 'No';
                  }
                  if (kw.includes('iron')) {
                    return isExperienced ? (skillsArray.some((s: string) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No') : 'No';
                  }
                  if (kw.includes('clean') || kw.includes('wash') || kw.includes('baby') || kw.includes('child')) {
                    return 'Yes';
                  }
                  return skillsArray.some((s: string) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No';
                };
                const hasLang = (keyword: string) => langsArray.some((l: string) => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';

                const formatValue = (val: any) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '' ? val : '-');

                const data = {
                  refNumber: candItem.id.slice(-6).toUpperCase(),
                  givenNames: formatValue(candItem.givenNames),
                  surname: formatValue(candItem.surname),
                  fullName: `${formatValue(candItem.givenNames)} ${formatValue(candItem.surname)}`.replace(/-/g, '').trim() || '-',
                  passportNumber: formatValue(candItem.passportNumber),
                  dateOfBirth: candItem.dateOfBirth ? candItem.dateOfBirth.toISOString().split('T')[0] : '-',
                  dob: candItem.dateOfBirth ? candItem.dateOfBirth.toISOString().split('T')[0] : '-',
                  gender: formatValue(candItem.gender),
                  nationality: formatValue(candItem.nationality),
                  issuingCountry: formatValue(candItem.issuingCountry),
                  dateOfIssue: candItem.dateOfIssue ? candItem.dateOfIssue.toISOString().split('T')[0] : '-',
                  issueDate: candItem.dateOfIssue ? candItem.dateOfIssue.toISOString().split('T')[0] : '-',
                  dateOfExpiry: candItem.dateOfExpiry ? candItem.dateOfExpiry.toISOString().split('T')[0] : '-',
                  expiryDate: candItem.dateOfExpiry ? candItem.dateOfExpiry.toISOString().split('T')[0] : '-',
                  issuePlace: formatValue(candItem.issuingCountry),
                  maritalStatus: formatValue(candItem.maritalStatus),
                  numberOfChildren: candItem.numberOfChildren || 0,
                  religion: formatValue(candItem.religion),
                  bloodType: formatValue(candItem.bloodType),
                  height: formatValue(candItem.height),
                  weight: formatValue(candItem.weight),
                  phone: formatValue(candItem.phone),
                  email: formatValue(candItem.email),
                  address: formatValue(candItem.city),
                  city: formatValue(candItem.city),
                  state: formatValue(candItem.state),
                  country: formatValue(candItem.country),
                  educationLevel: formatValue(candItem.educationLevel),
                  languages: langsArray.join(', ') || '-',
                  workExperience: formatValue(candItem.workExperience),
                  skills: skillsArray.join(', ') || '-',
                  medicalStatus: formatValue(candItem.medicalStatus),
                  knownConditions: formatValue(candItem.knownConditions),
                  emergencyName: formatValue(candItem.emergencyContactName),
                  emergencyPhone: formatValue(candItem.emergencyContactPhone),
                  job: formatValue(candItem.job),
                  age: calculateAge(candItem.dateOfBirth),

                  skillBaby: formatValue(hasSkill('baby')),
                  skillChildren: formatValue(hasSkill('child')),
                  skillTutor: formatValue(hasSkill('tutor')),
                  skillComputer: formatValue(hasSkill('computer')),
                  skillClean: formatValue(hasSkill('clean')),
                  skillWash: formatValue(hasSkill('wash')),
                  skillIron: formatValue(hasSkill('iron')),
                  skillCook: formatValue(hasSkill('cook')),
                  skillArabicCook: formatValue(hasSkill('arabic')),
                  skillSew: formatValue(hasSkill('sew')),
                  skillDrive: formatValue(hasSkill('driv')),
                  skillDisabled: formatValue(hasSkill('disabl')),

                  english: formatValue(hasLang('english')),
                  arabic: formatValue(hasLang('arabic')),

                  qrCode: qrCodeData,
                  expCountry: '-',
                  expPeriod: '-',

                  facePhoto: facePhotoData,
                  photo: facePhotoData,
                  fullBodyPhoto: fullBodyPhotoData,
                  passportPhoto: passportPhotoData,
                  'passport image': passportPhotoData,
                  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                  generatedAt: new Date().toLocaleDateString(),
                  FULL_NAME: `${formatValue(candItem.givenNames)} ${formatValue(candItem.surname)}`.replace(/-/g, '').trim() || '-',
                  NAME_AR: 'الاسم الكامل',
                  PASSPORT_NO: formatValue(candItem.passportNumber),
                  DOB: candItem.dateOfBirth ? candItem.dateOfBirth.toISOString().split('T')[0] : '-',
                  NATIONALITY: formatValue(candItem.nationality),
                  GENDER: formatValue(candItem.gender),
                  PHONE: formatValue(candItem.phone),
                  phoneNumber: formatValue(candItem.phone),
                  HEIGHT: formatValue(candItem.height),
                  WEIGHT: formatValue(candItem.weight),
                  EXPERIENCE: formatValue(candItem.workExperience),
                  workPeriod: formatValue(candItem.workExperience ? 'Experienced' : 'Fresher'),
                  position: formatValue(candItem.job),
                  salary: '-',
                  SKILLS: skillsArray.join(', ') || '-',
                  PLACE_OF_BIRTH: formatValue(candItem.placeOfBirth),
                  AGE: calculateAge(candItem.dateOfBirth),
                  expPosition: '-',
                };

                const exps = Array.isArray(candItem.workExperience) ? candItem.workExperience as any[] : [];
                const validExp = exps.find(e => e.experienceStatus === 'Have experience');
                if (validExp) {
                  data.expCountry = validExp.country || '-';
                  data.expPeriod = validExp.yearsOfExperience ? `${validExp.yearsOfExperience} YEARS` : '-';
                  data.expPosition = validExp.position || candItem.job || '-';
                }

                const sizeOf = require('image-size');
                const imageOptions = {
                  centered: true,
                  getImage: (tagValue: string) => {
                    if (!tagValue) return Buffer.from('');
                    const base64Data = tagValue.split(',')[1] || tagValue;
                    return Buffer.from(base64Data, 'base64');
                  },
                  getSize: (img: Buffer, tagValue: string, tagName: string) => {
                    if (tagName === 'qrCode') return [100, 100];
                    let maxWidth = 150, maxHeight = 180;
                    if (tagName === 'facePhoto' || tagName === 'photo') {
                      if (templateId === 'tmpl-ussus') { maxWidth = 220; maxHeight = 270; }
                      else if (templateId === 'tmpl-al-shablan') { maxWidth = 150; maxHeight = 165; }
                      else { maxWidth = 150; maxHeight = 180; }
                    } else if (tagName === 'fullBodyPhoto') {
                      if (templateId === 'tmpl-ussus') { maxWidth = 250; maxHeight = 500; }
                      else if (templateId === 'tmpl-al-shablan') { maxWidth = 240; maxHeight = 600; }
                      else { maxWidth = 320; maxHeight = 580; }
                    } else if (tagName === 'passport image' || tagName === 'passportPhoto') {
                      maxWidth = 550; maxHeight = 750;
                    }
                    try {
                      const dimensions = sizeOf(img);
                      const ratio = dimensions.width / dimensions.height;
                      if (ratio > maxWidth / maxHeight) {
                        return [maxWidth, Math.round(maxWidth / ratio)];
                      } else {
                        return [Math.round(maxHeight * ratio), maxHeight];
                      }
                    } catch (e) {
                      return [maxWidth, maxHeight];
                    }
                  }
                };

                const doc = new Docxtemplater(candidateZip, {
                  paragraphLoop: true,
                  linebreaks: true,
                  modules: [new ImageModule(imageOptions)],
                });

                doc.render(data);
                const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

                const passportNo = candItem.passportNumber || candItem.id.slice(-6);
                const namePart = `${candItem.givenNames || ''}_${candItem.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
                const safeName = `${namePart}_${passportNo}`.replace(/[^a-zA-Z0-9_]/g, '');

                zip.file(`${safeName}.docx`, docxBuf);
              } catch (err: any) {
                console.error(`[Bulk CV] Error generating DOCX for candidate ${candItem.id}:`, err);
                errors.push(`Candidate ${candItem.givenNames} ${candItem.surname}: ${err.message}`);
              } finally {
                bulkJobs[jobId].progress += 1;
              }
            }));
          }

          if (errors.length === candidates.length) {
            throw new Error(`All DOCX generations failed: \n${errors.join('\n')}`);
          }
        } else if (format === 'pdf' || format === 'jpg' || format === 'image') {
          const BATCH_SIZE = 10;
          let bulkChromium: any;
          try {
            bulkChromium = require('playwright').chromium;
          } catch {
            bulkJobs[jobId].status = 'failed';
            bulkJobs[jobId].error = 'PDF/image generation not available on this server. Use DOCX format.';
            return;
          }
          const browser = await bulkChromium.launch({ headless: true, args: ['--no-sandbox'] });
          const errors: string[] = [];

          try {
            const queue = [...candidates];
            const workers = Array.from({ length: Math.min(BATCH_SIZE, queue.length) }, async () => {
              while (queue.length > 0) {
                const candItem = queue.shift();
                if (!candItem) break;

                const page = await browser.newPage();
                try {
                  const firstCv = candItem.generatedCVs?.[0];
                  const rawTemplateId = firstCv ? firstCv.templateId : 'rawasi';
                  const clientTemplateRoute = rawTemplateId.replace('tmpl-', '').toLowerCase();

                  const printUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/cv-print/${candItem.id}/${clientTemplateRoute}`;

                  await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });

                  let outputBuf: Buffer;
                  let extension: string;

                  if (format === 'pdf') {
                    outputBuf = await page.pdf({ format: 'A4', printBackground: true });
                    extension = 'pdf';
                  } else {
                    outputBuf = await page.screenshot({ type: 'jpeg', fullPage: true });
                    extension = 'jpg';
                  }

                  const passportNo = candItem.passportNumber || candItem.id.slice(-6);
                  const namePart = `${candItem.givenNames || ''}_${candItem.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
                  const safeName = `${namePart}_${passportNo}`.replace(/[^a-zA-Z0-9_]/g, '');

                  zip.file(`${safeName}.${extension}`, outputBuf);
                } catch (err: any) {
                  console.error(`[Bulk CV] Error rendering page for candidate ${candItem.id}:`, err);
                  errors.push(`Candidate ${candItem.givenNames} ${candItem.surname}: ${err.message}`);
                } finally {
                  await page.close();
                  bulkJobs[jobId].progress += 1;
                }
              }
            });

            await Promise.all(workers);
          } finally {
            await browser.close();
          }

          if (errors.length === candidates.length) {
            throw new Error(`All PDF/JPG generations failed: \n${errors.join('\n')}`);
          }
        }

        console.log(`[Bulk CV] Compressing ZIP for job ${jobId}...`);
        const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        bulkJobs[jobId].zipBuffer = zipBuf;
        bulkJobs[jobId].status = 'completed';
        console.log(`[Bulk CV] Completed job: ${jobId}`);

        // Update database in bulk
        await db.update(candidate)
          .set({ cvDownloaded: true })
          .where(inArray(candidate.id, candidateIds));

        for (const candItem of candidates) {
          try {
            const firstCv = candItem.generatedCVs?.[0];
            if (!firstCv) {
              await db.insert(generatedCV).values({
                candidateId: candItem.id,
                templateId: 'rawasi',
                facePhotoUrl: candItem.facePhotoUrl || '',
                fullBodyPhotoUrl: candItem.fullBodyPhotoUrl || ''
              });
            }
          } catch (dbErr) {
            console.warn(`[Bulk CV] Failed to create default GeneratedCV for candidate ${candItem.id}`, dbErr);
          }
        }

      } catch (err: any) {
        console.error(`[Bulk CV] Job failed: ${jobId}`, err);
        bulkJobs[jobId].status = 'failed';
        bulkJobs[jobId].error = err.message || 'Generation failed';
      }
    })();
  } catch (error: any) {
    console.error('Bulk generate CV error:', error);
    res.status(500).json({ error: error?.message || 'Failed to initialize bulk generation' });
  }
});

router.get('/bulk-generate/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = bulkJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    progress: job.progress,
    total: job.total,
    status: job.status,
    error: job.error
  });
});

router.get('/bulk-generate/download/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = bulkJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found or has expired' });
  }

  if (job.status !== 'completed' || !job.zipBuffer) {
    return res.status(400).json({ error: 'Job is not completed yet' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="CVs_Bulk_${Date.now()}.zip"`);
  res.send(job.zipBuffer);

  // Clean up memory immediately
  delete bulkJobs[jobId];
});

router.post('/candidates-batch', async (req: Request, res: Response) => {
  try {
    const { candidateIds } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'candidateIds must be a non-empty array' });
    }

    const dbCandidates = await db.query.candidate.findMany({
      where: inArray(candidate.id, candidateIds),
      with: { 
        generatedCVs: true,
        broker: true,
        registeredBy: true
      }
    });

    const candidates = dbCandidates.filter(c => !c.isLocked);

    const formatDate = (date: Date | null | undefined) => date?.toISOString().split('T')[0] || '';

    const formatted = candidates.map((c: any) => ({
      id: c.id,
      shelfId: c.shelfId,
      cvDeadline: formatDate(c.cvDeadline),
      passportData: {
        passportNumber: c.passportNumber,
        surname: c.surname,
        givenNames: c.givenNames,
        dateOfBirth: formatDate(c.dateOfBirth),
        gender: c.gender,
        nationality: c.nationality,
        issuingCountry: c.issuingCountry,
        dateOfIssue: formatDate(c.dateOfIssue),
        dateOfExpiry: formatDate(c.dateOfExpiry),
        placeOfBirth: c.placeOfBirth,
      },
      personalInfo: {
        idNumber: c.idNumber || c.passportNumber,
        job: c.job || '',
        maritalStatus: c.maritalStatus,
        numberOfChildren: c.numberOfChildren,
        religion: c.religion,
        bloodType: c.bloodType,
        height: c.height,
        weight: c.weight,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        state: c.state,
        country: c.country,
        educationLevel: c.educationLevel,
        languages: c.languages,
        workExperience: c.workExperience || [],
        skills: c.skills,
        medicalStatus: c.medicalStatus,
        biometricStatus: c.biometricStatus,
        medicalDate: formatDate(c.medicalDate),
        biometricDate: formatDate(c.biometricDate),
        knownConditions: c.knownConditions,
        emergencyContactName: c.emergencyContactName,
        emergencyContactRelation: c.emergencyContactRelation,
        emergencyContactPhone: c.emergencyContactPhone,
        emergencyContactAddress: c.emergencyContactAddress,
        additionalPhones: c.additionalPhones,
        brokerId: c.brokerId || '',
        cocDocumentUrl: c.cocDocumentUrl || '',
        medicalDocumentUrl: c.medicalDocumentUrl || '',
        candidateIdImageUrl: c.candidateIdImageUrl || '',
        relativeIdImageUrl: c.relativeIdImageUrl || '',
        labourIdUrl: c.labourIdUrl || '',
        salary: c.salary || '1000SR',
      },
      brokerId: c.brokerId,
      broker: c.broker || null,
      passportImageUrl: c.passportImageUrl || '',
      facePhotoUrl: c.facePhotoUrl || '',
      fullBodyPhotoUrl: c.fullBodyPhotoUrl || '',
      cocDocumentUrl: c.cocDocumentUrl || '',
      medicalDocumentUrl: c.medicalDocumentUrl || '',
      candidateIdImageUrl: c.candidateIdImageUrl || '',
      relativeIdImageUrl: c.relativeIdImageUrl || '',
      labourIdUrl: c.labourIdUrl || '',
      isRequested: c.isRequested || false,
      visaOrContractNumber: c.visaOrContractNumber || null,
      isFlagged: c.isFlagged || false,
      isLocked: c.isLocked || false,
      cvDownloaded: c.cvDownloaded || false,
      videoUrl: c.videoUrl || null,
      Youtube_URL: c.videoUrl || null,
      deployedDate: formatDate(c.deployedDate),
      registeredAt: c.registeredAt.toISOString(),
      status: c.status,
      visaSelected: c.visaSelected,
      visaDate: c.visaDate ? c.visaDate.toISOString() : null,
      salary: c.salary || '1000SR',
      generatedCVs: c.generatedCVs?.map((cv: any) => ({ id: cv.id, templateId: cv.templateId })) || [],
      latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
      registeredBy: c.registeredBy?.name || 'Admin',
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Candidates batch fetch error:', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch candidates details' });
  }
});

export default router;
