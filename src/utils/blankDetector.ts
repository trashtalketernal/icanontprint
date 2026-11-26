export interface PageAnalysis {
  isBlank: boolean;
  brightness: number;
  variance: number;
}

/**
 * Analyzes an image data URL on an offscreen HTML5 Canvas to determine
 * whether the scanned page is effectively blank (high brightness, low pixel variance).
 */
export function analyzeScannedPage(dataUrl: string, strictnessPercent = 88): Promise<PageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const sampleWidth = 96;
        const sampleHeight = 128;
        const canvas = document.createElement('canvas');
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ isBlank: false, brightness: 90, variance: 500 });
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sampleWidth, sampleHeight);
        ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);

        const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        let sum = 0;
        let sumSq = 0;
        let nonWhitePixels = 0;
        const totalPixels = sampleWidth * sampleHeight;

        // Ignore outer 5px margins in case of scanner lid shadow
        let counted = 0;
        for (let y = 5; y < sampleHeight - 5; y++) {
          for (let x = 5; x < sampleWidth - 5; x++) {
            const idx = (y * sampleWidth + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            sum += lum;
            sumSq += lum * lum;
            if (lum < 215) {
              nonWhitePixels++;
            }
            counted++;
          }
        }

        const mean = sum / Math.max(1, counted);
        const variance = Math.max(0, sumSq / Math.max(1, counted) - mean * mean);
        const brightness = Math.round((mean / 255) * 100);
        const contentRatio = nonWhitePixels / Math.max(1, counted);

        // strictnessPercent (50..98) tunes how aggressive blank detection is
        const maxAllowedContentRatio = ((100 - strictnessPercent) / 100) * 0.08 + 0.004;
        const maxAllowedVariance = (100 - strictnessPercent) * 12 + 80;

        const isBlank =
          mean > 235 &&
          contentRatio <= maxAllowedContentRatio &&
          variance <= maxAllowedVariance;

        resolve({
          isBlank,
          brightness,
          variance: Math.round(variance),
        });
      } catch {
        resolve({ isBlank: false, brightness: 90, variance: 500 });
      }
    };
    img.onerror = () => {
      resolve({ isBlank: false, brightness: 90, variance: 500 });
    };
    img.src = dataUrl;
  });
}
