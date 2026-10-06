/**
 * Utilitaires pour l'intégration de Google Drive dans Sof.IA
 * Permet d'importer des PDF directement depuis Google Drive sans téléversement R2
 * (zéro octet consommé sur Cloudflare R2).
 */

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  previewUrl: string;
  mimeType?: string;
  sizeBytes?: number;
}

const STORAGE_KEY_CLIENT_ID = 'sofia_google_client_id';
const STORAGE_KEY_API_KEY = 'sofia_google_api_key';

/**
 * Récupère le Client ID Google configuré (priorité: localStorage puis .env)
 */
export function getGoogleClientId(): string {
  const local = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
  if (local && local.trim()) return local.trim();
  const envVal = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return envVal ? String(envVal).trim() : '';
}

/**
 * Sauvegarde un Client ID Google personnalisé dans le navigateur
 */
export function setGoogleClientId(clientId: string): void {
  if (clientId) {
    localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
  }
}

/**
 * Récupère la Developer Key Google configurée (priorité: localStorage puis .env)
 */
export function getGoogleApiKey(): string {
  const local = localStorage.getItem(STORAGE_KEY_API_KEY);
  if (local && local.trim()) return local.trim();
  const envVal = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  return envVal ? String(envVal).trim() : '';
}

/**
 * Sauvegarde une Developer Key Google personnalisée
 */
export function setGoogleApiKey(apiKey: string): void {
  if (apiKey) {
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  }
}

/**
 * Extrait l'identifiant unique (fileId) d'un lien Google Drive quelconque
 */
export function extractGoogleDriveFileId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Format /file/d/{id}/...
  const matchFileD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // 2. Format id={id}
  const matchParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchParam && matchParam[1]) return matchParam[1];

  // 3. Format /open?id={id}
  const matchOpen = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (matchOpen && matchOpen[1]) return matchOpen[1];

  // 4. Si c'est déjà un ID brut (alphanumérique avec tirets/underscores, >= 20 chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Génère l'URL officielle de prévisualisation intégrable Google Drive pour <iframe>
 */
export function getGoogleDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Vérifie si une URL donnée pointe vers un document Google Drive
 */
export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

/**
 * Charge dynamiquement les scripts officiels Google Identity Services et Google API
 */
let scriptsLoadingPromise: Promise<void> | null = null;
export function loadGoogleScripts(): Promise<void> {
  if (scriptsLoadingPromise) return scriptsLoadingPromise;

  scriptsLoadingPromise = new Promise((resolve, reject) => {
    let gsiLoaded = !!window.google?.accounts?.oauth2;
    let gapiLoaded = !!window.gapi;

    const checkDone = () => {
      if (gsiLoaded && gapiLoaded) {
        resolve();
      }
    };

    if (gsiLoaded && gapiLoaded) {
      return resolve();
    }

    if (!gsiLoaded) {
      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      gsiScript.onload = () => {
        gsiLoaded = true;
        checkDone();
      };
      gsiScript.onerror = () => reject(new Error('Échec du chargement de Google Identity Services'));
      document.head.appendChild(gsiScript);
    }

    if (!gapiLoaded) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        gapiLoaded = true;
        checkDone();
      };
      gapiScript.onerror = () => reject(new Error('Échec du chargement de Google API Client (GAPI)'));
      document.head.appendChild(gapiScript);
    }
  });

  return scriptsLoadingPromise;
}

/**
 * Ouvre le sélecteur officiel Google Picker pour choisir des PDF
 */
export async function openGoogleDrivePicker(options?: {
  clientId?: string;
  apiKey?: string;
  multiSelect?: boolean;
}): Promise<{ files: GoogleDriveFile[]; accessToken: string }> {
  const clientId = options?.clientId || getGoogleClientId();
  const apiKey = options?.apiKey || getGoogleApiKey();

  if (!clientId) {
    throw new Error('Veuillez renseigner un Google Client ID pour ouvrir l\'explorateur Google Drive.');
  }

  await loadGoogleScripts();

  return new Promise((resolve, reject) => {
    try {
      // 1. Initialiser le Token Client OAuth 2.0
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Authentification Google annulée'));
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            return reject(new Error('Jeton d\'accès Google non fourni.'));
          }

          // 2. Charger le module Picker via gapi
          window.gapi.load('picker', () => {
            try {
              const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
                .setMimeTypes('application/pdf')
                .setMode(window.google.picker.DocsViewMode.LIST);

              const appId = clientId.split('-')[0];
              const builder = new window.google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(accessToken)
                .setAppId(appId)
                .setCallback((data: any) => {
                  if (data.action === window.google.picker.Action.PICKED) {
                    const docs = data.docs || [];
                    const files: GoogleDriveFile[] = docs.map((doc: any) => ({
                      id: doc.id,
                      name: doc.name || 'Cours Google Drive',
                      previewUrl: getGoogleDrivePreviewUrl(doc.id),
                      mimeType: doc.mimeType,
                      sizeBytes: doc.sizeBytes
                    }));
                    resolve({ files, accessToken });
                  } else if (data.action === window.google.picker.Action.CANCEL) {
                    reject(new Error('Sélection annulée par l\'utilisateur.'));
                  }
                });

              if (apiKey) {
                builder.setDeveloperKey(apiKey);
              }

              if (options?.multiSelect !== false) {
                builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
              }

              const picker = builder.build();
              picker.setVisible(true);
            } catch (err) {
              reject(err);
            }
          });
        },
      });

      // 3. Déclencher la demande de jeton (popup Google)
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Télécharge le contenu brut d'un fichier Google Drive en mémoire vive (ArrayBuffer)
 * pour en extraire le texte, SANS AUCUN téléversement sur Cloudflare R2.
 */
export async function fetchGoogleDrivePDFBuffer(
  fileId: string, 
  accessToken?: string
): Promise<ArrayBuffer> {
  // Option 1 : Utilisation directe de l'API Google avec le jeton OAuth si fourni
  if (accessToken) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      return await res.arrayBuffer();
    }
  }

  // Option 2 : Endpoint de proxy serveur Sofia (/api/drive-download)
  // Permet de contourner les restrictions CORS sur les liens partagés publics
  const proxyUrl = `/api/drive-download?fileId=${encodeURIComponent(fileId)}${accessToken ? `&token=${encodeURIComponent(accessToken)}` : ''}`;
  const response = await fetch(proxyUrl);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur lors de la récupération du PDF Google Drive (${response.status})`);
  }

  return await response.arrayBuffer();
}
