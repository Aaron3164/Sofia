import { createClient } from '@supabase/supabase-js';

import { compressPDF } from './pdf-compressor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a PDF to Cloudflare R2 after optimizing/compressing it.
 * Supabase Storage is NO LONGER used to store heavy PDF files.
 */
export async function uploadPDF(file: File, subjectId: string): Promise<string | null> {
  try {
    console.log(`[Upload] Traitement du fichier : ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    // 1. Client-side PDF compression & optimization
    const processedFile = await compressPDF(file);

    // 2. Request presigned upload URL from backend
    const presignRes = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: processedFile.name,
        contentType: processedFile.type || 'application/pdf',
        folder: subjectId || 'general',
      }),
    });

    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      const errorMsg = errData.error || `Erreur serveur HTTP ${presignRes.status}`;
      console.error('[Cloudflare R2] Impossible d\'obtenir l\'URL d\'upload pré-signée :', errorMsg);
      alert(`⚠️ Erreur Cloudflare R2 :\n${errorMsg}`);
      return null;
    }

    const { uploadUrl, publicUrl } = await presignRes.json();

    // 3. Direct browser-to-R2 upload (zero backend payload limit issues)
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': processedFile.type || 'application/pdf',
      },
      body: processedFile,
    });

    if (!uploadRes.ok) {
      console.error('[Cloudflare R2] Échec du téléversement PUT vers R2 :', uploadRes.status, uploadRes.statusText);
      alert(`⚠️ Échec de l'envoi vers Cloudflare R2 (${uploadRes.status} ${uploadRes.statusText}). Pensez à vérifier la règle CORS du bucket R2.`);
      return null;
    }

    console.log('[Cloudflare R2] Téléversement réussi ! URL :', publicUrl);
    return publicUrl;
  } catch (err: any) {
    console.error('Erreur inattendue dans uploadPDF (Cloudflare R2) :', err);
    alert(`Erreur lors de l'envoi vers Cloudflare R2 : ${err?.message || String(err)}`);
    return null;
  }
}

/**
 * Deletes a PDF file from Cloudflare R2 given its public URL or storage key.
 */
export async function deletePDFFromR2(urlOrKey: string): Promise<boolean> {
  if (!urlOrKey) return false;
  try {
    const res = await fetch('/api/r2-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: urlOrKey }),
    });
    if (!res.ok) {
      console.warn('[R2 Delete] Server returned status', res.status);
      return false;
    }
    const data = await res.json();
    console.log('[R2 Delete] Successfully deleted from Cloudflare R2:', data.deletedKey);
    return true;
  } catch (err) {
    console.error('[R2 Delete Error]:', err);
    return false;
  }
}


