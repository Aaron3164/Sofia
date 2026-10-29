import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker path using CDN with explicit https to avoid HTTP/HTTPS CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function isItemBold(item: any, styles: any): boolean {
  if (!item) return false;
  
  const fontName = (item.fontName || '').toLowerCase();
  const style = styles && item.fontName ? styles[item.fontName] : null;
  const fontFamily = (style?.fontFamily || '').toLowerCase();
  
  const combined = `${fontName} ${fontFamily}`;
  if (!combined.trim()) return false;

  // Direct font name / family checks for bold keywords
  if (
    combined.includes('bold') ||
    combined.includes('heavy') ||
    combined.includes('black') ||
    combined.includes('semibold') ||
    combined.includes('demibold') ||
    combined.includes('w7') ||
    combined.includes('w8') ||
    combined.includes('w9')
  ) {
    return true;
  }

  // Check explicit numeric font weights >= 600
  if (style && typeof style.fontWeight === 'number' && style.fontWeight >= 600) {
    return true;
  }

  // Standard PostScript / TeX bold tags
  if (/\b(cmbx|cmb|phvb|ptmbf|helv-b|arial-b|times-b)\b/.test(combined)) {
    return true;
  }
  if (/-b\b|_b\b|-bold\b|_bold\b|bd$/i.test(fontName)) {
    return true;
  }

  return false;
}

function formatBoldChunk(buffer: string): string {
  const trimmed = buffer.trim();
  if (!trimmed) {
    return buffer;
  }

  const leadingSpace = buffer.match(/^\s*/)?.[0] || '';
  const trailingSpace = buffer.match(/\s*$/)?.[0] || '';

  return `${leadingSpace}**${trimmed}**${trailingSpace}`;
}

function appendWithSmartSpace(target: string, addition: string): string {
  if (!target) return addition;
  if (!addition) return target;

  if (target.endsWith(' ') || target.endsWith('\n') || addition.startsWith(' ') || addition.startsWith('\n')) {
    return target + addition;
  }

  if (/^[.,;:!?\)\]]/.test(addition)) {
    return target + addition;
  }

  return target + ' ' + addition;
}

export async function getPDFPageCount(file: File | Blob | ArrayBuffer): Promise<number> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

export async function checkPDFPageCount(file: File | Blob | ArrayBuffer, maxAllowed = 50): Promise<number> {
  const pageCount = await getPDFPageCount(file);
  if (pageCount > maxAllowed) {
    throw new Error(`Le fichier PDF dépasse la limite de ${maxAllowed} pages (${pageCount} pages détectées). Veuillez importer un document de ${maxAllowed} pages maximum depuis vos fichiers locaux, ou passez par l'importation Google Drive.`);
  }
  return pageCount;
}

export async function extractTextFromPDF(
  file: File | Blob | ArrayBuffer, 
  onProgress?: (current: number, total: number) => void,
  options?: { maxPages?: number }
): Promise<string> {
  try {
    const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    if (options?.maxPages && numPages > options.maxPages) {
      throw new Error(`Le fichier PDF dépasse la limite de ${options.maxPages} pages (${numPages} pages détectées). Veuillez sélectionner un document plus court ou l'importer via Google Drive.`);
    }

    const allPageTexts: string[] = new Array(numPages);
    
    // Process in batches to avoid memory/CPU saturation
    const BATCH_SIZE = 10;
    for (let i = 0; i < numPages; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, numPages); j++) {
        batch.push((async (pageIdx: number) => {
          const page = await pdf.getPage(pageIdx + 1);
          const content = await page.getTextContent();
          const items = (content.items || []) as any[];
          const styles = content.styles || {};

          let pageText = '';
          let inBold = false;
          let boldBuffer = '';

          for (let k = 0; k < items.length; k++) {
            const item = items[k];
            if (!item || typeof item.str !== 'string') continue;

            const str = item.str;
            if (!str && !item.hasEOL) continue;

            const isBold = isItemBold(item, styles);

            if (isBold) {
              if (!inBold) {
                inBold = true;
                boldBuffer = str;
              } else {
                boldBuffer = appendWithSmartSpace(boldBuffer, str);
              }
            } else {
              if (inBold) {
                const formatted = formatBoldChunk(boldBuffer);
                pageText = appendWithSmartSpace(pageText, formatted);
                inBold = false;
                boldBuffer = '';
              }

              if (str) {
                pageText = appendWithSmartSpace(pageText, str);
              }
            }

            if (item.hasEOL) {
              if (inBold) {
                const formatted = formatBoldChunk(boldBuffer);
                pageText = appendWithSmartSpace(pageText, formatted);
                inBold = false;
                boldBuffer = '';
              }
              if (!pageText.endsWith('\n')) {
                pageText += '\n';
              }
            }
          }

          if (inBold) {
            const formatted = formatBoldChunk(boldBuffer);
            pageText = appendWithSmartSpace(pageText, formatted);
          }

          allPageTexts[pageIdx] = `--- Page ${pageIdx + 1} ---\n${pageText.trim()}\n\n`;
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

