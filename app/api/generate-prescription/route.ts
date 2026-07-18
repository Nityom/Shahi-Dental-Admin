// app/api/generate-prescription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

interface ToothData {
  id: number;
  type: string;
  category: 'Permanent' | 'Deciduous';
  disease?: string;
}

interface MedicineEntry {
  name: string;
  dosage: string;
  duration: string;
  quantity?: number;
}

interface PrescriptionData {
  patientName: string;
  age: string;
  sex: string;
  date: string;
  cc: string;
  mh: string;
  de: string;
  advice: string;
  followupDate: string;
  medicines?: MedicineEntry[];
  dentalNotation: string;
  clinicalNotes: string;
  selectedTeeth: ToothData[];
  investigation?: string;
  treatmentPlan?: string[];
  referenceNumber?: string;
}

// A4 dimensions in points
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 50;
const MARGIN_R = 50;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/** Replace characters outside WinAnsi range so pdf-lib standard fonts can encode them */
function sanitize(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/\u2014/g, '-')   // em dash
    .replace(/\u2013/g, '-')   // en dash
    .replace(/\u2018|\u2019/g, "'")  // smart single quotes
    .replace(/\u201C|\u201D/g, '"')  // smart double quotes
    .replace(/[^\x00-\xFF]/g, '?'); // fallback for anything else
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const safe = sanitize(text);
  const paragraphs = safe.split('\n');
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (!word) continue;
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    result.push(...(lines.length ? lines : ['']));
  }
  return result.length ? result : [''];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxW: number,
  lineH: number,
  color = rgb(0, 0, 0)
): number {
  const lines = wrapText(text, font, size, maxW);
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineH;
  }
  return y;
}

function formatDate(d: string): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB');
}

export async function POST(req: NextRequest) {
  try {
    const data: PrescriptionData = await req.json();

    // Build teeth string
    if (data.selectedTeeth && data.selectedTeeth.length > 0) {
      const teethInfo = data.selectedTeeth.map(tooth => {
        const id = tooth.id.toString();
        const q = id[0];
        const n = parseInt(id.slice(1));
        const disp = n >= 9 && n <= 13
          ? `${q}${String.fromCharCode('A'.charCodeAt(0) + n - 9)}`
          : id;
        return `#${disp} (${tooth.disease || tooth.type})`;
      }).join('; ');
      data.dentalNotation = teethInfo;
    }

    // Load sign.png
    const signPath = path.join(process.cwd(), 'public', 'sign.png');
    let signImageBytes: Uint8Array | null = null;
    try {
      signImageBytes = await fs.readFile(signPath);
    } catch {
      // sign.png not found, skip
    }

    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let signImage = null;
    if (signImageBytes) {
      signImage = await pdfDoc.embedPng(signImageBytes);
    }

    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 40;

    // Header
    const clinicName = 'Shahi Dental Clinic';
    const clinicNameW = boldFont.widthOfTextAtSize(clinicName, 18);
    page.drawText(clinicName, {
      x: (PAGE_W - clinicNameW) / 2, y,
      size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.5),
    });
    y -= 22;

    const subtitle = 'Prescription';
    const subtitleW = regularFont.widthOfTextAtSize(subtitle, 11);
    page.drawText(subtitle, {
      x: (PAGE_W - subtitleW) / 2, y,
      size: 11, font: regularFont, color: rgb(0.3, 0.3, 0.3),
    });
    y -= 14;

    page.drawLine({ start: { x: MARGIN_L, y }, end: { x: PAGE_W - MARGIN_R, y }, thickness: 1.5, color: rgb(0, 0, 0) });
    y -= 14;

    // Patient info grid
    const sz = 10;
    const lh = 16;
    const col1x = MARGIN_L + 4;
    const col2x = MARGIN_L + CONTENT_W / 2;
    const lblW = 100;

    const infoRows: [string, string, string, string][] = [
      ['Patient Name', data.patientName, 'Patient Number', data.referenceNumber || '—'],
      ['Age', data.age, 'Date', formatDate(data.date)],
      ['Sex', data.sex, 'Contact', '—'],
    ];
    if (data.followupDate) {
      infoRows.push(['Visit Type', 'Consultation', 'Follow-up', formatDate(data.followupDate)]);
    }

    for (const [l1, v1, l2, v2] of infoRows) {
      page.drawText(`${l1}:`, { x: col1x, y, size: sz, font: boldFont, color: rgb(0, 0, 0) });
      page.drawText(v1, { x: col1x + lblW, y, size: sz, font: regularFont, color: rgb(0, 0, 0) });
      page.drawText(`${l2}:`, { x: col2x, y, size: sz, font: boldFont, color: rgb(0, 0, 0) });
      page.drawText(v2, { x: col2x + lblW, y, size: sz, font: regularFont, color: rgb(0, 0, 0) });
      y -= lh;
    }
    y -= 4;

    page.drawLine({ start: { x: MARGIN_L, y }, end: { x: PAGE_W - MARGIN_R, y }, thickness: 1.5, color: rgb(0, 0, 0) });
    y -= 14;

    // Section helpers
    const SH = 11;
    const SB = 10;
    const SLH = 15;

    function drawSection(heading: string, text: string) {
      page.drawText(heading, { x: MARGIN_L, y, size: SH, font: boldFont, color: rgb(0, 0, 0) });
      const hw = boldFont.widthOfTextAtSize(heading, SH);
      page.drawLine({ start: { x: MARGIN_L, y: y - 1 }, end: { x: MARGIN_L + hw, y: y - 1 }, thickness: 0.8, color: rgb(0, 0, 0) });
      y -= SH + 4;
      y = drawWrappedText(page, text, MARGIN_L + 16, y, regularFont, SB, CONTENT_W - 20, SLH);
      y -= 6;
    }

    if (data.de) drawSection('DIAGNOSIS', data.de);
    if (data.cc) drawSection('CHIEF COMPLAINT', data.cc);
    if (data.mh) drawSection('MEDICAL HISTORY', data.mh);

    const oralParts: string[] = [];
    if (data.dentalNotation) oralParts.push(`Teeth involved: ${data.dentalNotation}`);
    if (data.clinicalNotes) oralParts.push(data.clinicalNotes);
    if (oralParts.length > 0) drawSection('ORAL EXAMINATION', oralParts.join('; '));

    if (data.investigation) drawSection('INVESTIGATION', data.investigation);

    if (data.treatmentPlan && data.treatmentPlan.length > 0) {
      drawSection('TREATMENT PLAN', data.treatmentPlan.map((s, i) => `${i + 1}. ${s}`).join('\n'));
    }

    // Medications table
    if (data.medicines && data.medicines.length > 0) {
      page.drawText('MEDICATIONS', { x: MARGIN_L, y, size: SH, font: boldFont, color: rgb(0, 0, 0) });
      const mhw = boldFont.widthOfTextAtSize('MEDICATIONS', SH);
      page.drawLine({ start: { x: MARGIN_L, y: y - 1 }, end: { x: MARGIN_L + mhw, y: y - 1 }, thickness: 0.8, color: rgb(0, 0, 0) });
      y -= SH + 6;

      const colSno = MARGIN_L;
      const colName = MARGIN_L + 30;
      const colDos = MARGIN_L + 280;
      const colDur = MARGIN_L + 390;
      const tableRight = PAGE_W - MARGIN_R;
      const rowH = 18;

      page.drawRectangle({ x: colSno, y: y - 2, width: CONTENT_W, height: rowH, color: rgb(0.85, 0.85, 0.85) });
      page.drawRectangle({ x: colSno, y: y - 2, width: CONTENT_W, height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
      page.drawText('#', { x: colSno + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
      page.drawText('Medication', { x: colName + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
      page.drawText('Dosage', { x: colDos + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
      page.drawText('Duration', { x: colDur + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
      for (const cx of [colName, colDos, colDur, tableRight]) {
        page.drawLine({ start: { x: cx, y: y - 2 }, end: { x: cx, y: y + rowH - 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
      }
      y -= rowH;

      for (let i = 0; i < data.medicines.length; i++) {
        const med = data.medicines[i];
        const nameLines = wrapText(med.name, regularFont, 9, colDos - colName - 10);
        const rowHeight = Math.max(rowH, nameLines.length * 13 + 6);

        page.drawRectangle({ x: colSno, y: y - rowHeight + rowH, width: CONTENT_W, height: rowHeight, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
        for (const cx of [colName, colDos, colDur, tableRight]) {
          page.drawLine({ start: { x: cx, y: y - rowHeight + rowH }, end: { x: cx, y: y + 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
        }
        page.drawText(`${i + 1}`, { x: colSno + 4, y: y + 4, size: 9, font: regularFont, color: rgb(0, 0, 0) });
        let nyRow = y + 4;
        for (const nl of nameLines) {
          page.drawText(nl, { x: colName + 4, y: nyRow, size: 9, font: regularFont, color: rgb(0, 0, 0) });
          nyRow -= 13;
        }
        page.drawText(med.dosage || '—', { x: colDos + 4, y: y + 4, size: 9, font: regularFont, color: rgb(0, 0, 0) });
        page.drawText(med.duration || '—', { x: colDur + 4, y: y + 4, size: 9, font: regularFont, color: rgb(0, 0, 0) });
        y -= rowHeight;
      }
      y -= 8;
    }

    if (data.advice) drawSection('ADVICE / INSTRUCTIONS', data.advice);
    if (data.followupDate) drawSection('NEXT APPOINTMENT', formatDate(data.followupDate));

    // Signature block
    const sigY = Math.min(y - 30, 160);
    const sigBlockX = PAGE_W - MARGIN_R - 160;

    if (signImage) {
      const imgDims = signImage.scaleToFit(110, 55);
      page.drawImage(signImage, {
        x: sigBlockX + (160 - imgDims.width) / 2,
        y: sigY,
        width: imgDims.width,
        height: imgDims.height,
      });
    }

    const sigLabelY = sigY - 14;
    const sigLabel = "Doctor's Signature";
    const sigLabelW = boldFont.widthOfTextAtSize(sigLabel, 9);
    page.drawText(sigLabel, { x: sigBlockX + (160 - sigLabelW) / 2, y: sigLabelY, size: 9, font: boldFont, color: rgb(0, 0, 0) });
    const consLabel = 'Consultant';
    const consLabelW = regularFont.widthOfTextAtSize(consLabel, 8.5);
    page.drawText(consLabel, { x: sigBlockX + (160 - consLabelW) / 2, y: sigLabelY - 12, size: 8.5, font: regularFont, color: rgb(0.3, 0.3, 0.3) });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=prescription-${data.patientName.replace(/\s+/g, '-')}.pdf`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error generating prescription PDF:', error);
    return NextResponse.json({ error: 'Failed to generate prescription PDF' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
