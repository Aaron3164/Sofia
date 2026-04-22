import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker path using CDN to avoid Vite bundling issues with the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPDF(
  file: File, 
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const allPageTexts: string[] = new Array(numPages);
    
    // Process in batches to avoid memory/CPU saturation
    const BATCH_SIZE = 10;
    for (let i = 0; i < numPages; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, numPages); j++) {
        batch.push((async (pageIdx: number) => {
          const page = await pdf.getPage(pageIdx + 1);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          allPageTexts[pageIdx] = `--- Page ${pageIdx + 1} ---\n${pageText}\n\n`;
          if (onProgress) onProgress(pageIdx + 1, numPages);
        })(j));
      }
      await Promise.all(batch);
    }
    
    return allPageTexts.join('');
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to parse PDF document.');
  }
}
