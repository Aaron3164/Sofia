import { PDFDocument } from 'pdf-lib';

/**
 * Optimizes and compresses a PDF file before uploading.
 * Uses pdf-lib object stream consolidation to reduce file size.
 * Returns the compressed file if smaller, otherwise the original file.
 */
export async function compressPDF(file: File): Promise<File> {
  // Only process PDF files
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return file;
  }

  try {
    const originalSize = file.size;
    console.log(`[PDF Compressor] Original size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB`);

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { 
      ignoreEncryption: true,
      updateMetadata: false 
    });

    // Save with object streams enabled (groups objects and compresses them)
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedSize = compressedBytes.byteLength;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    if (compressedSize < originalSize) {
      console.log(`[PDF Compressor] Compressed size: ${(compressedSize / (1024 * 1024)).toFixed(2)} MB (${ratio}% reduction)`);
      return new File([compressedBytes as unknown as BlobPart], file.name, { type: 'application/pdf' });
    } else {
      console.log(`[PDF Compressor] File already optimal, keeping original.`);
      return file;
    }
  } catch (err) {
    console.warn('[PDF Compressor] Compression skipped due to error, proceeding with original file:', err);
    return file;
  }
}
