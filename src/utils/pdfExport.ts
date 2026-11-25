import { jsPDF } from 'jspdf';
import { ScannedPage } from '../types';

export function exportPagesToPdf(pages: ScannedPage[], title: string = 'Scan_Document') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      doc.addPage();
    }

    try {
      // Add image to PDF
      const imgWidth = 210; // A4 width in mm
      const imgHeight = 297; // A4 height in mm
      doc.addImage(page.dataUrl, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    } catch (e) {
      console.error('Error adding image to PDF:', e);
      doc.setFontSize(14);
      doc.text(`Page ${index + 1} (Image error)`, 20, 20);
    }
  });

  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${safeTitle}.pdf`);
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
