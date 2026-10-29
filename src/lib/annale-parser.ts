import * as pdfjsLib from 'pdfjs-dist';
import { compressImage } from './image-utils';

// Ensure PDF.js worker is properly configured
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedQuestion {
  id: string;
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswers: string[];
  images?: string[];
  explanation?: string;
  pageNumber?: number;
}

export interface AnnaleParseResult {
  title?: string;
  questions: ExtractedQuestion[];
  rawText: string;
  totalImagesExtracted: number;
  unassignedImages: { id: string; url: string; pageNumber: number }[];
}

/**
 * Checks whether an extracted canvas image is a genuine medical/academic illustration
 * (photo, schema, radiography, ECG, histology slide) or a layout artifact (solid black box,
 * mask, table border, or solid background).
 */
function isValidDocumentIllustration(canvas: HTMLCanvasElement, imgObj: any): boolean {
  if (imgObj?.isMask || imgObj?.mask) return false;

  const w = canvas.width;
  const h = canvas.height;

  // Real academic figures / diagrams are at least 100x100px
  if (w < 100 || h < 100) return false;

  // Reject extreme aspect ratios (lines, thin banners, table borders)
  const ratio = w / h;
  if (ratio > 5.5 || ratio < 0.18) return false;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const totalPixels = w * h;

    // Sample up to 800 pixels evenly spaced
    const step = Math.max(1, Math.floor(totalPixels / 800));
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
    let colorfulOrMidtones = 0;

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.abs(r - rAvg) + Math.abs(g - gAvg) + Math.abs(b - bAvg);
      varianceSum += diff;

      // Count pixels that are NOT pure black (<15) and NOT pure white (>240)
      if ((r > 15 || g > 15 || b > 15) && (r < 240 || g < 240 || b < 240)) {
        colorfulOrMidtones++;
      }
    }

    const avgVariance = varianceSum / count;

    // If average variance is very low, it's a solid rectangle (solid black header, solid gray fill, etc.)
    if (avgVariance < 16) {
      return false;
    }

    // If virtually all pixels are pure solid black or pure white with no gradient/details
    if ((colorfulOrMidtones / count) < 0.05 && avgVariance < 28) {
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
async function extractImagesFromPage(page: any, pageNumber: number): Promise<string[]> {
  const images: string[] = [];

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
      try {
        const imgObj = await new Promise<any>((resolve) => {
          let resolved = false;

          const check = (obj: any) => {
            if (!resolved && obj) {
              resolved = true;
              resolve(obj);
            }
          };

          // Try page.objs
          if (page.objs && typeof page.objs.get === 'function') {
            try {
              page.objs.get(objId, check);
            } catch {}
          }

          // Try commonObjs
          if (page.commonObjs && typeof page.commonObjs.get === 'function') {
            try {
              page.commonObjs.get(objId, check);
            } catch {}
          }

          // Safety timeout if object doesn't resolve in 1.5s
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          }, 1500);
        });

        if (!imgObj || imgObj.isMask || imgObj.mask) continue;

        // Ignore tiny icon-like graphics or thin lines (< 100px)
        const width = imgObj.width || 0;
        const height = imgObj.height || 0;
        if (width < 100 || height < 100) continue;

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
            // RGBA
            imgData = new ImageData(new Uint8ClampedArray(imgObj.data), width, height);
          } else if (dataLen === width * height * 3) {
            // RGB -> RGBA
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
            // Grayscale -> RGBA
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
        // Compress image to ensure lightweight storage
        const compressed = await compressImage(rawDataUrl, 1200, 1200, 0.80);
        images.push(compressed);
      } catch (err) {
        console.warn(`[Annale Parser] Could not extract image ${objId} on page ${pageNumber}:`, err);
      }
    }
  } catch (err) {
    console.warn(`[Annale Parser] Error scanning images on page ${pageNumber}:`, err);
  }

  return images;
}

/**
 * Normalizes letters from answers like "A, C, E" or "ACE" or "B D" -> ["A", "C", "E"]
 */
export function parseAnswerLetters(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw.toUpperCase().replace(/[^A-G]/g, '');
  const unique = Array.from(new Set(cleaned.split(''))).sort();
  return unique;
}

/**
 * Parses an external or pasted correction grid string.
 * Example:
 * 1: AC
 * 2: BDE
 * Q3: A, C
 * 4. BC
 */
export function parseCorrectionGridText(gridText: string): Map<number, string[]> {
  const result = new Map<number, string[]>();
  if (!gridText || !gridText.trim()) return result;

  const lines = gridText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matches "1: AC", "Q1. B, C", "Question 12 - A C D", "12) ACE"
    const match = trimmed.match(/(?:Q(?:uestion|CM)?\s*)?(\d{1,3})\s*[:\.\)\-–—\s]+\s*([A-Ga-g,\s]+)/i);
    if (match) {
      const qNum = parseInt(match[1], 10);
      const answers = parseAnswerLetters(match[2]);
      if (qNum > 0 && answers.length > 0) {
        result.set(qNum, answers);
      }
    }
  }

  return result;
}

/**
 * Detects whether the text contains an end-of-document correction grid and parses it.
 */
function extractTrailingCorrectionGrid(fullText: string): { cleanedText: string; grid: Map<number, string[]> } {
  const grid = new Map<number, string[]>();
  
  // Look for sections like "CORRECTION", "GRILLE DE CORRECTION", "CORRIGÉ", "RÉPONSES" towards the end
  const gridSectionRegex = /(?:\n\s*(?:(?:GRILLE\s+DE\s+CORRECTION|CORRECTION\s+DES\s+QCM|CORRECTION|CORRIG[ÉE]|R[ÉE]PONSES|CL[ÉE]\s+DE\s+CORRECTION)\b[^\n]*\n))([\s\S]*)$/i;
  const match = fullText.match(gridSectionRegex);

  if (match && match[1]) {
    const gridText = match[1];
    const parsedGrid = parseCorrectionGridText(gridText);
    if (parsedGrid.size >= 2) {
      // If we found at least 2 questions in the grid, consider it valid
      const splitIndex = match.index || fullText.length;
      return {
        cleanedText: fullText.substring(0, splitIndex).trim(),
        grid: parsedGrid
      };
    }
  }

  return { cleanedText: fullText, grid };
}

/**
 * 100% 0-TOKEN ALGORTHMIC PARSER FOR ANNALES / QCM
 * Parses raw text extracted from PDF and extracts questions, propositions, inline answers, and maps images.
 */
export function parseAnnaleQuestionsFromText(
  rawTextWithPageMarkers: string,
  pageImagesMap: Map<number, string[]> = new Map()
): AnnaleParseResult {
  // Step 1: Check for trailing correction grid
  const { cleanedText, grid: trailingGrid } = extractTrailingCorrectionGrid(rawTextWithPageMarkers);

  // Step 2: Split text into lines, keeping track of page numbers
  const lines = cleanedText.split('\n');
  let currentPage = 1;

  interface TaggedLine {
    text: string;
    page: number;
  }

  const taggedLines: TaggedLine[] = [];

  for (const line of lines) {
    const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10) || currentPage;
      continue;
    }
    taggedLines.push({ text: line, page: currentPage });
  }

  // Step 3: Identify Question start indices
  // Question start headers:
  // "Question 1", "Question 1 :", "QCM 1.", "Item 1", "Q1 :", "Dossier 1 - Question 2"
  // Or standalone number: "1." or "1)" at start of line
  const questionHeaderRegex = /^\s*(?:(?:Question|QCM|Item|Q\.?)\s*(?:n°|numéro)?\s*(\d{1,3})[\s.:\)\-–—]+|(?:Dossier|DP|Cas\s*clinique)\s*\d+.*?Question\s*(\d{1,3})[\s.:\)\-–—]+)/i;
  const standaloneNumberRegex = /^\s*(\d{1,3})\s*[\.:\)\-–—]\s*(?=[A-ZÀ-ÖØ-öø-ÿ])/;

  interface RawQuestionBlock {
    questionNumber: number;
    startLineIdx: number;
    pageNumber: number;
  }

  const blocks: RawQuestionBlock[] = [];

  for (let i = 0; i < taggedLines.length; i++) {
    const lineText = taggedLines[i].text.trim();
    if (!lineText) continue;

    const qMatch = lineText.match(questionHeaderRegex);
    if (qMatch) {
      const qNum = parseInt(qMatch[1] || qMatch[2], 10);
      blocks.push({
        questionNumber: qNum,
        startLineIdx: i,
        pageNumber: taggedLines[i].page
      });
      continue;
    }

    // Check standalone number regex only if not already starting with A-G
    if (!/^[A-Ga-g][\.\)\:\-–—\/\s]/.test(lineText)) {
      const numMatch = lineText.match(standaloneNumberRegex);
      if (numMatch) {
        const qNum = parseInt(numMatch[1], 10);
        // Only accept if sequence makes sense (e.g. 1, 2, 3...)
        const prevNum = blocks.length > 0 ? blocks[blocks.length - 1].questionNumber : 0;
        if (qNum === prevNum + 1 || (blocks.length === 0 && qNum === 1)) {
          blocks.push({
            questionNumber: qNum,
            startLineIdx: i,
            pageNumber: taggedLines[i].page
          });
        }
      }
    }
  }

  // If no questions were found with headers, try splitting by questions if they are separated by double newlines or numbered blocks
  const extractedQuestions: ExtractedQuestion[] = [];
  const unassignedImages: { id: string; url: string; pageNumber: number }[] = [];

  // Group images by page
  const pageImagesCopy = new Map<number, string[]>();
  pageImagesMap.forEach((imgs, p) => {
    pageImagesCopy.set(p, [...imgs]);
  });

  const optionRegex = /^\s*(?:[\(\[]?([A-Ga-g])[\.\)\:\-–—\/\s\]]|\b([A-Ga-g])[\.\)\:\-–—\/])\s*(.*)$/;
  const inlineAnswerRegex = /(?:R[eé]ponse[s]?|Corrig[eé]|Correction|Sol(?:ution)?|R[eé]p|Bonne[s]?\s*r[eé]ponse[s]?|Vraie[s]?|Cl[eé])\s*(?:\([^)]*\))?\s*(?:vraie[s]?|juste[s]?|exacte[s]?|attendue[s]?)?\s*[:\-=]\s*([A-Ga-g,\s]+)/i;
  const inlineExplanationRegex = /(?:Explication[s]?|Justification[s]?|Commentaire[s]?)\s*[:\-=]\s*(.*)$/i;

  if (blocks.length > 0) {
    for (let b = 0; b < blocks.length; b++) {
      const curBlock = blocks[b];
      const nextStartIdx = b < blocks.length - 1 ? blocks[b + 1].startLineIdx : taggedLines.length;

      const blockLines = taggedLines.slice(curBlock.startLineIdx, nextStartIdx);
      
      let rawQuestionStem = '';
      const options: string[] = [];
      let currentOptionText = '';
      let currentOptionLetter = '';
      let inlineAnswers: string[] = [];
      let inlineExplanation = '';
      let isReadingOptions = false;

      for (let l = 0; l < blockLines.length; l++) {
        const line = blockLines[l].text;
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for inline answer first
        const ansMatch = trimmed.match(inlineAnswerRegex);
        if (ansMatch) {
          inlineAnswers = parseAnswerLetters(ansMatch[1]);
          // Clean the rest of line if any
          continue;
        }

        // Check for inline explanation
        const explMatch = trimmed.match(inlineExplanationRegex);
        if (explMatch) {
          inlineExplanation = explMatch[1].trim();
          continue;
        }

        // Check if line is an option (A, B, C, D, E)
        const optMatch = trimmed.match(optionRegex);
        if (optMatch) {
          isReadingOptions = true;
          // Commit previous option if any
          if (currentOptionLetter && currentOptionText) {
            options.push(`${currentOptionLetter}. ${currentOptionText.trim()}`);
          }
          currentOptionLetter = (optMatch[1] || optMatch[2]).toUpperCase();
          currentOptionText = optMatch[3] || '';
          continue;
        }

        if (isReadingOptions) {
          // Continuation of the current option
          if (currentOptionText) {
            currentOptionText += ' ' + trimmed;
          } else {
            currentOptionText = trimmed;
          }
        } else {
          // Question stem lines
          if (l === 0) {
            // Strip the question header from the first line for a clean question text
            let cleanedHeader = trimmed.replace(questionHeaderRegex, '').replace(standaloneNumberRegex, '').trim();
            if (cleanedHeader.startsWith(':') || cleanedHeader.startsWith('-')) {
              cleanedHeader = cleanedHeader.substring(1).trim();
            }
            rawQuestionStem = cleanedHeader;
          } else {
            rawQuestionStem = rawQuestionStem ? `${rawQuestionStem} ${trimmed}` : trimmed;
          }
        }
      }

      // Commit last option
      if (currentOptionLetter && currentOptionText) {
        options.push(`${currentOptionLetter}. ${currentOptionText.trim()}`);
      }

      // Determine correct answers: priority to inline answers, then trailing grid
      let finalCorrectAnswers = inlineAnswers;
      if (finalCorrectAnswers.length === 0 && trailingGrid.has(curBlock.questionNumber)) {
        finalCorrectAnswers = trailingGrid.get(curBlock.questionNumber) || [];
      }

      // Attach images ONLY if question text explicitly refers to a figure or illustration
      const questionImages: string[] = [];
      const pageImgs = pageImagesCopy.get(curBlock.pageNumber) || [];
      const mentionsFigure = /(?:figure|sch[eé]ma|photo|clich[eé]|radiographie|radio|scanner|irm|ecg|trac[eé]|image|illustration|\bdoc(?:ument)?\b)/i.test(rawQuestionStem);
      if (mentionsFigure && pageImgs.length > 0) {
        questionImages.push(...pageImgs);
        pageImagesCopy.delete(curBlock.pageNumber); // Consumed for this question
      }

      extractedQuestions.push({
        id: crypto.randomUUID(),
        questionNumber: curBlock.questionNumber,
        question: rawQuestionStem.trim() || `Question ${curBlock.questionNumber}`,
        options: options.length > 0 ? options : [
          'A. Proposition A',
          'B. Proposition B',
          'C. Proposition C',
          'D. Proposition D',
          'E. Proposition E'
        ],
        correctAnswers: finalCorrectAnswers,
        images: questionImages.length > 0 ? questionImages : undefined,
        explanation: inlineExplanation || undefined,
        pageNumber: curBlock.pageNumber
      });
    }
  }

  // Any remaining unassigned images from the document
  pageImagesCopy.forEach((imgs, pageNum) => {
    imgs.forEach((imgUrl) => {
      unassignedImages.push({
        id: crypto.randomUUID(),
        url: imgUrl,
        pageNumber: pageNum
      });
    });
  });

  let totalImagesCount = 0;
  extractedQuestions.forEach(q => {
    if (q.images) totalImagesCount += q.images.length;
  });
  totalImagesCount += unassignedImages.length;

  return {
    questions: extractedQuestions,
    rawText: rawTextWithPageMarkers,
    totalImagesExtracted: totalImagesCount,
    unassignedImages
  };
}

import { parseAnnaleWithAI } from './gemini';

/**
 * Main function: extracts text and embedded images from PDF,
 * uses Sofia IA for 100% layout comprehension (inverted formats, checkboxes, SIDES),
 * and falls back to algorithmic parser if needed.
 */
export async function parseAnnalePDF(
  file: File | Blob | ArrayBuffer,
  onProgress?: (progressText: string, current: number, total: number) => void
): Promise<AnnaleParseResult> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const pageTexts: string[] = [];
  const pageImagesMap = new Map<number, string[]>();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(`Lecture du document : page ${pageNum}/${numPages}...`, pageNum, numPages);
    }

    const page = await pdf.getPage(pageNum);
    
    // 1. Text extraction
    const content = await page.getTextContent();
    const items = (content.items || []) as any[];
    let pageText = '';
    for (const item of items) {
      if (!item || typeof item.str !== 'string') continue;
      pageText += (item.hasEOL ? item.str + '\n' : item.str + ' ');
    }
    pageTexts.push(`--- Page ${pageNum} ---\n${pageText.trim()}\n\n`);

    // 2. Images extraction
    try {
      const imagesOnPage = await extractImagesFromPage(page, pageNum);
      if (imagesOnPage.length > 0) {
        pageImagesMap.set(pageNum, imagesOnPage);
      }
    } catch (e) {
      console.warn(`[Annale Parser] Could not extract images for page ${pageNum}:`, e);
    }
  }

  const fullText = pageTexts.join('');

  // 3. Sofia IA parsing for complete layout and checkbox comprehension
  try {
    if (onProgress) {
      onProgress('Sofia IA structure les questions mot pour mot et analyse le corrigé...', numPages, numPages);
    }
    const aiQuestions = await parseAnnaleWithAI(fullText);
    if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
      const pageImagesCopy = new Map<number, string[]>();
      pageImagesMap.forEach((imgs, p) => pageImagesCopy.set(p, [...imgs]));

      const extractedQuestions: ExtractedQuestion[] = aiQuestions.map((q: any, idx: number) => {
        const qNum = q.questionNumber || idx + 1;
        const pageNum = q.pageNumber || 1;
        const questionImages: string[] = [];
        const pageImgs = pageImagesCopy.get(pageNum) || [];
        const qText = String(q.question || '');
        const mentionsFigure = q.hasFigure === true || 
          /(?:figure|sch[eé]ma|photo|clich[eé]|radiographie|radio|scanner|irm|ecg|trac[eé]|image|illustration|\bdoc(?:ument)?\b)/i.test(qText);

        if (mentionsFigure && pageImgs.length > 0) {
          questionImages.push(...pageImgs);
          pageImagesCopy.delete(pageNum);
        }

        const rawOptions = Array.isArray(q.options) ? q.options : [];
        const cleanOptions = rawOptions.map((opt: string, optIdx: number) => {
          const letter = String.fromCharCode(65 + optIdx);
          let cleaned = String(opt || '').trim();
          cleaned = cleaned.replace(/^[A-Ga-g][\.\)\:\-–—\/\s\]]*/, '').trim();
          cleaned = cleaned.replace(/^[☑■☒☐\[\]xX\s\-\–—\(\)]+/, '').trim();
          return `${letter}. ${cleaned}`;
        });

        const rawAnswers = q.correctAnswers || q.correct_answers || [];
        const cleanAnswers = Array.isArray(rawAnswers) 
          ? rawAnswers.map((a: any) => String(a).toUpperCase().replace(/[^A-G]/g, '')).filter(Boolean)
          : parseAnswerLetters(String(rawAnswers));

        return {
          id: crypto.randomUUID(),
          questionNumber: qNum,
          question: String(q.question || `Question ${qNum}`).trim(),
          options: cleanOptions.length > 0 ? cleanOptions : [
            'A. Première proposition',
            'B. Deuxième proposition',
            'C. Troisième proposition',
            'D. Quatrième proposition',
            'E. Cinquième proposition'
          ],
          correctAnswers: Array.from(new Set(cleanAnswers)).sort(),
          images: questionImages.length > 0 ? questionImages : undefined,
          explanation: q.explanation ? String(q.explanation).trim() : undefined,
          pageNumber: pageNum
        };
      });

      const unassignedImages: { id: string; url: string; pageNumber: number }[] = [];
      pageImagesCopy.forEach((imgs, pageNum) => {
        imgs.forEach(url => {
          unassignedImages.push({ id: crypto.randomUUID(), url, pageNumber: pageNum });
        });
      });

      let totalImages = extractedQuestions.reduce((acc, q) => acc + (q.images?.length || 0), 0) + unassignedImages.length;

      return {
        questions: extractedQuestions,
        rawText: fullText,
        totalImagesExtracted: totalImages,
        unassignedImages
      };
    }
  } catch (aiErr) {
    console.warn('[Annale Parser] Sofia IA parsing error, trying algorithmic fallback:', aiErr);
  }

  // Fallback to algorithmic parser
  if (onProgress) {
    onProgress('Découpage algorithmique des QCM et des propositions...', numPages, numPages);
  }

  const result = parseAnnaleQuestionsFromText(fullText, pageImagesMap);
  return result;
}

