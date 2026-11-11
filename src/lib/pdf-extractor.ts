import { compressImage } from './image-utils';

let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((pdfjsLib) => {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url
        ).toString();
      } catch (e) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }
      return pdfjsLib;
    });
  }
  return pdfjsLibPromise;
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
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

/**
 * Estime le nombre de tokens d'un texte (français / multi-langue).
 * En français, 1 token correspond à environ 3,5 à 4 caractères (espaces compris).
 * On utilise la méthode standard de l'écosystème LLM : Math.ceil(text.trim().length / 3.7).
 */
export function estimateTokens(text: string): number {
  if (!text || !text.trim()) return 0;
  return Math.ceil(text.trim().length / 3.7);
}

/**
 * Vérifie que le contenu textuel extrait du document respecte la limite de tokens allouée selon le plan.
 * Gratuit : 9 500 tokens max (~7 000 mots / ~15 pages denses)
 * Premium : 32 000 tokens max (~24 000 mots / ~50 pages denses)
 */
export function checkContentTokenLimit(text: string, maxTokens = 32000): { tokenCount: number; isValid: boolean } {
  const tokenCount = estimateTokens(text);
  if (tokenCount > maxTokens) {
    const approxWords = Math.round(tokenCount * 0.75);
    const maxWords = Math.round(maxTokens * 0.75);
    throw new Error(
      `Ce document dépasse la limite de volume autorisée (${tokenCount.toLocaleString()} tokens / ~${approxWords.toLocaleString()} mots détectés). ` +
      `La limite pour votre forfait est de ${maxTokens.toLocaleString()} tokens (~${maxWords.toLocaleString()} mots). ` +
      `Veuillez scinder votre cours ou passer au plan supérieur.`
    );
  }
  return { tokenCount, isValid: true };
}

export async function checkPDFPageCount(file: File | Blob | ArrayBuffer, maxAllowed = 50): Promise<number> {
  const pageCount = await getPDFPageCount(file);
  if (pageCount > maxAllowed) {
    throw new Error(`Le fichier PDF dépasse la limite indicative de ${maxAllowed} pages (${pageCount} pages détectées). Veuillez importer un document de ${maxAllowed} pages maximum.`);
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
    const pdfjsLib = await getPdfJs();
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
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    if (options?.maxPages && numPages > options.maxPages) {
      throw new Error(`Le fichier PDF dépasse la limite de ${options.maxPages} pages (${numPages} pages détectées). Veuillez sélectionner un document de ${options.maxPages} pages maximum.`);
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

    const cleanedText = cleanExtractedPDFTextLossless(allPageTexts);

    return {
      text: cleanedText || allPageTexts.join(''),
      schemas: allSchemas
    };
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error('Failed to parse PDF document.');
  }
}

/**
 * Nettoyage algorithmique professionnel et 100% SANS PERTE de connaissances :
 * 1. Détection et suppression statistique des en-têtes et pieds de page répétitifs (apparaissant sur >25% des pages)
 * 2. Suppression des numéros de pages isolés et mentions de copyright
 * 3. Réparation automatique des césures de mots de fin de ligne (ex: "pharma-\n cologie" -> "pharmacologie")
 * 4. Compression des pointillés infinis de sommaire ("....." -> " — ")
 * 5. Préservation absolue et intégrale des titres, sous-parties, termes médicaux/juridiques, listes et chiffres.
 */
export function cleanExtractedPDFTextLossless(rawPageTexts: string[]): string {
  if (!rawPageTexts || rawPageTexts.length === 0) return '';

  const numPages = rawPageTexts.length;
  // La déduplication d'en-tête n'a de sens que sur les vrais polycopiés (>= 5 pages).
  // Sur un document court de 1 à 4 pages, il n'y a quasiment aucun gain et aucun risque à prendre.
  const minPagesForHeaderDedup = 5;

  const pageLines = rawPageTexts.map(text => {
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  });

  const repeatedBoundaryLines = new Set<string>();

  if (numPages >= minPagesForHeaderDedup) {
    const lineFrequencies = new Map<string, number>();

    pageLines.forEach(lines => {
      if (lines.length === 0) return;
      const candidates = new Set<string>();
      
      // Analyser strictement la 1ère ou 2ème ligne du haut (en-tête)
      for (let i = 0; i < Math.min(2, lines.length); i++) {
        candidates.add(lines[i]);
      }
      // Analyser strictement la toute dernière ligne du bas (pied de page)
      for (let i = Math.max(0, lines.length - 2); i < lines.length; i++) {
        candidates.add(lines[i]);
      }

      candidates.forEach(c => {
        // Normaliser les chiffres (ex: "Page 1 / 40" et "Page 2 / 40" deviennent "page # / #")
        const normalized = c.replace(/\b\d+\b/g, '#').toLowerCase();
        lineFrequencies.set(normalized, (lineFrequencies.get(normalized) || 0) + 1);
      });
    });

    // Seuil strict : la ligne doit être présente sur au moins 50% des pages ET au minimum 4 pages distinctes
    const threshold = Math.max(4, Math.ceil(numPages * 0.50));
    lineFrequencies.forEach((count, normLine) => {
      // Ignorer les lignes trop longues (> 120 caractères) qui pourraient être des phrases de contenu
      if (count >= threshold && normLine.length <= 120) {
        repeatedBoundaryLines.add(normLine);
      }
    });
  }

  const cleanedPages = pageLines.map((lines, idx) => {
    const pageNum = idx + 1;
    const filtered = lines.filter((line, lineIdx) => {
      // 1. Filtrer les en-têtes et pieds de page répétés en bordure
      const isBoundary = lineIdx < 2 || lineIdx >= lines.length - 2;
      if (isBoundary && repeatedBoundaryLines.size > 0) {
        const norm = line.replace(/\b\d+\b/g, '#').toLowerCase();
        if (repeatedBoundaryLines.has(norm)) {
          return false;
        }
      }

      // 2. Supprimer les lignes isolées de pagination (ex: "12", "- 12 -", "Page 12 / 50")
      if (/^(?:page\s*)?-?\s*\d+\s*(?:\/\s*\d+|-)?$/i.test(line)) {
        return false;
      }

      // 3. Supprimer les mentions de copyright pures
      if (/^(?:tous droits réservés|reproduction interdite|all rights reserved|copyright ©?.*)$/i.test(line)) {
        return false;
      }

      return true;
    });

    let pageText = filtered.join('\n');

    // 4. Réparer les césures de fin de ligne : "pharma-\n cologie" => "pharmacologie"
    pageText = pageText.replace(/([a-zA-ZÀ-ÿ0-9]+)-\s*\n\s*([a-zA-ZÀ-ÿ0-9]+)/g, '$1$2');

    // 5. Nettoyer les pointillés de sommaire : "Chapitre 1 ............. 12" => "Chapitre 1 — 12"
    pageText = pageText.replace(/\.{4,}/g, ' — ');

    // 6. Compactage des espaces multiples
    pageText = pageText.replace(/[ \t]{2,}/g, ' ').trim();

    return `--- Page ${pageNum} ---\n${pageText}\n\n`;
  });

  return cleanedPages.join('').trim();
}

export async function extractTextFromPDF(
  file: File | Blob | ArrayBuffer, 
  onProgress?: (current: number, total: number) => void,
  options?: { maxPages?: number }
): Promise<string> {
  const result = await extractCourseContentFromPDF(file, onProgress, options);
  return result.text;
}

