import { jsPDF } from 'jspdf';
import { ScannedPage } from '../types';

function renderRotatedPage(dataUrl: string, rotation: number): Promise<string> {
  return new Promise((resolve) => {
    if (rotation % 360 === 0) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (rotation * Math.PI) / 180;
      const swap = rotation % 180 !== 0;
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function buildPdfDocument(pages: ScannedPage[]): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let index = 0; index < pages.length; index++) {
    if (index > 0) {
      doc.addPage();
    }
    const page = pages[index];
    try {
      const prepared = await renderRotatedPage(page.dataUrl, page.rotation || 0);
      const props = doc.getImageProperties(prepared);
      const pageWidth = 210;
      const pageHeight = 297;
      const ratio = Math.min(pageWidth / props.width, pageHeight / props.height);
      const renderW = props.width * ratio;
      const renderH = props.height * ratio;
      const offsetX = (pageWidth - renderW) / 2;
      const offsetY = (pageHeight - renderH) / 2;
      doc.addImage(prepared, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
    } catch {
      doc.setFontSize(12);
      doc.text(`Page ${index + 1}`, 20, 20);
    }
  }

  return doc;
}

export async function exportPagesToPdf(pages: ScannedPage[], title = 'Canon_Scan') {
  const doc = await buildPdfDocument(pages);
  const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Canon_Scan';
  doc.save(`${safeTitle}.pdf`);
}

export async function buildPdfBase64(pages: ScannedPage[]): Promise<string> {
  const doc = await buildPdfDocument(pages);
  return doc.output('datauristring');
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safe = filename.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Document';
  link.download = `${safe}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
