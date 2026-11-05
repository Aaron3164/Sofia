import * as pdfjsLib from 'pdfjs-dist';
import { compressImage } from './image-utils';

// Use local Vite URL for the pdf worker to avoid Cloudflare/CDN blocking, with CDN fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ExtractedCourseSchema {
  id: string; // e.g. "FIGURE_1", "FIGURE_2"
  url: string; // Base64 data URL
  pageNumber: number;
}

export interface ExtractedCourseData {
  text: string;
  schemas: ExtractedCourseSchema[];
}

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
    throw new Error(`Le fichier PDF dépasse la limite autorisée de ${maxAllowed} pages (${pageCount} pages détectées). Veuillez importer un document de ${maxAllowed} pages maximum depuis vos fichiers locaux, ou passez par l'importation Google Drive.`);
  }
  return pageCount;
}

/**
 * Filter out non-illustration graphics such as solid black background bars,
 * header lines, solid white boxes, or decoration borders.
 */
function isValidDocumentIllustration(canvas: HTMLCanvasElement, _imgObj?: any): boolean {
  const w = canvas.width;
  const h = canvas.height;

  if (w < 60 || h < 60) return false;

  // Reject extreme aspect ratios (thin lines, vertical dividers, tiny ribbons)
  const ratio = w / h;
  if (ratio > 9.0 || ratio < 0.11) return false;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const totalPixels = w * h;

    // Sample up to 600 pixels evenly spaced
    const step = Math.max(1, Math.floor(totalPixels / 600));
    let rSum = 0, gSum = 0, bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += step * 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }

    if (count === 0) return false;

    const rAvg = rSum / count;
    const gAvg = gSum / count;
    const bAvg = bSum / count;

    let varianceSum = 0;

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.abs(r - rAvg) + Math.abs(g - gAvg) + Math.abs(b - bAvg);
      varianceSum += diff;
    }

    const avgVariance = varianceSum / count;

    // Reject only pure solid uniform blocks (like a 100% white box or 100% solid black box)
    if (avgVariance < 0.4) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Extracts all embedded images from a PDF page using PDF.js operator lists and objects.
 */
async function extractImagesFromPage(
  page: any,
  pageNumber: number,
  startIndex: number,
  maxAllowed: number
): Promise<ExtractedCourseSchema[]> {
  const schemas: ExtractedCourseSchema[] = [];
  if (maxAllowed <= 0) return schemas;

  try {
    const ops = await page.getOperatorList();
    const imageObjIds: string[] = [];

    // Find all paintImage operator calls
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (
        fn === (pdfjsLib as any).OPS.paintImageXObject ||
        fn === (pdfjsLib as any).OPS.paintInlineImageXObject
      ) {
        const objId = ops.argsArray[i]?.[0];
        if (objId && typeof objId === 'string' && !imageObjIds.includes(objId)) {
          imageObjIds.push(objId);
        }
      }
    }

    // Resolve each image object
    for (const objId of imageObjIds) {
      if (schemas.length >= maxAllowed) break;

      try {
        const imgObj = await new Promise<any>((resolve) => {
          let resolved = false;

          const check = (obj: any) => {
            if (!resolved && obj) {
              resolved = true;
              resolve(obj);
            }
          };

          if (page.objs && typeof page.objs.get === 'function') {
            try {
              // Synchronous resolution check first
              const immediate = page.objs.get(objId);
              if (immediate) {
                resolved = true;
                resolve(immediate);
                return;
              }
              page.objs.get(objId, check);
            } catch {}
          }

          if (!resolved && page.commonObjs && typeof page.commonObjs.get === 'function') {
            try {
              const immediate = page.commonObjs.get(objId);
              if (immediate) {
                resolved = true;
                resolve(immediate);
                return;
              }
              page.commonObjs.get(objId, check);
            } catch {}
          }

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          }, 500);
        });

        if (!imgObj || imgObj.isMask || imgObj.mask) continue;

        const width = imgObj.width || 0;
        const height = imgObj.height || 0;
        if (width < 60 || height < 60) continue;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        if (imgObj.bitmap && typeof ctx.drawImage === 'function') {
          ctx.drawImage(imgObj.bitmap, 0, 0);
        } else if (imgObj.data) {
          const dataLen = imgObj.data.length;
          let imgData: ImageData | null = null;

          if (dataLen === width * height * 4) {
            imgData = new ImageData(new Uint8ClampedArray(imgObj.data), width, height);
          } else if (dataLen === width * height * 3) {
            const rgba = new Uint8ClampedArray(width * height * 4);
            let p = 0;
            for (let k = 0; k < dataLen; k += 3) {
              rgba[p++] = imgObj.data[k];
              rgba[p++] = imgObj.data[k + 1];
              rgba[p++] = imgObj.data[k + 2];
              rgba[p++] = 255;
            }
            imgData = new ImageData(rgba, width, height);
          } else if (dataLen === width * height) {
            const rgba = new Uint8ClampedArray(width * height * 4);
            let p = 0;
            for (let k = 0; k < dataLen; k++) {
              const val = imgObj.data[k];
              rgba[p++] = val;
              rgba[p++] = val;
              rgba[p++] = val;
              rgba[p++] = 255;
            }
            imgData = new ImageData(rgba, width, height);
          }

          if (imgData) {
            ctx.putImageData(imgData, 0, 0);
          } else {
            continue;
          }
        } else {
          continue;
        }

        // Verify that this is a genuine illustration and not a solid black box or background banner
        if (!isValidDocumentIllustration(canvas, imgObj)) {
          continue;
        }

        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        // Compress image to ensure lightweight payload
        const compressed = await compressImage(rawDataUrl, 850, 850, 0.78);
        const figId = `FIGURE_${startIndex + schemas.length + 1}`;
        schemas.push({
          id: figId,
          url: compressed,
          pageNumber
        });
      } catch (err) {
        console.warn(`Could not extract image ${objId} on page ${pageNumber}:`, err);
      }
    }
  } catch (err) {
    console.warn(`Error scanning images on page ${pageNumber}:`, err);
  }

  return schemas;
}

/**
 * Extracts both text and genuine course schemas/illustrations page by page in exact chronological order.
 */
export async function extractCourseContentFromPDF(
  file: File | Blob | ArrayBuffer,
  onProgress?: (current: number, total: number) => void,
  options?: { maxPages?: number; maxSchemas?: number }
): Promise<ExtractedCourseData> {
  try {
    const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    if (options?.maxPages && numPages > options.maxPages) {
      throw new Error(`Le fichier PDF dépasse la limite de ${options.maxPages} pages (${numPages} pages détectées). Veuillez sélectionner un document plus court ou l'importer via Google Drive.`);
    }

    const allPageTexts: string[] = new Array(numPages);
    const allSchemas: ExtractedCourseSchema[] = [];
    const MAX_TOTAL_SCHEMAS = options?.maxSchemas || 25;

    // Process page by page in sequential order to guarantee chronological schema numbering and order
    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
      const pageNum = pageIdx + 1;
      const page = await pdf.getPage(pageNum);

      // 1. Text extraction with bold formatting
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

      allPageTexts[pageIdx] = `--- Page ${pageNum} ---\n${pageText.trim()}\n\n`;

      // 2. Extract schemas for this page if quota not reached
      const remainingQuota = MAX_TOTAL_SCHEMAS - allSchemas.length;
      if (remainingQuota > 0) {
        try {
          const pageSchemas = await extractImagesFromPage(page, pageNum, allSchemas.length, remainingQuota);
          allSchemas.push(...pageSchemas);
        } catch (imgErr) {
          console.warn(`Erreur extraction images page ${pageNum}:`, imgErr);
        }
      }

      if (onProgress) onProgress(pageNum, numPages);
    }

    return {
      text: allPageTexts.join(''),
      schemas: allSchemas
    };
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error('Failed to parse PDF document.');
  }
}

export async function extractTextFromPDF(
  file: File | Blob | ArrayBuffer, 
  onProgress?: (current: number, total: number) => void,
  options?: { maxPages?: number }
): Promise<string> {
  const result = await extractCourseContentFromPDF(file, onProgress, options);
  return result.text;
}

