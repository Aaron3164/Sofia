import { mdToHtml } from './markdown';

export interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  htmlContent?: string;
  markdownContent?: string;
  isPremium?: boolean;
}

/**
 * Downloads a clean, beautifully formatted PDF sheet using native browser print pipeline.
 * Zero external weight, supports Markdown, tables, KaTeX, images, and custom styling.
 * For Premium users: Strips all "SofIA", "Généré...", and AI brandings so it looks 100% human-made.
 */
export function exportContentToPDF({ title, subtitle, htmlContent, markdownContent, isPremium = false }: ExportPdfOptions): void {
  const content = htmlContent || (markdownContent ? mdToHtml(markdownContent) : '');

  // Hidden print iframe to avoid disturbing current view or navigation
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  printIframe.style.visibility = 'hidden';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(printIframe);
    return;
  }

  const documentTitle = isPremium ? `${title}` : `${title} - SofIA`;

  // Headers and Subtitles: Premium removes AI tags
  const headerBrand = isPremium ? 'Fiche de Révision' : 'SofIA • Fiche de Révision';
  const headerMeta = isPremium ? new Date().toLocaleDateString('fr-FR') : `Généré le ${new Date().toLocaleDateString('fr-FR')}`;
  const cleanSubtitle = subtitle 
    ? (isPremium ? subtitle.replace(/\s*-\s*SofIA/gi, '').replace(/\s*par\s*Sofia/gi, '').replace(/IA/gi, '').trim() : subtitle)
    : '';

  const printHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${documentTitle}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 18mm 15mm 18mm;
          @bottom-left { content: none; }
          @bottom-right { content: none; }
          @top-left { content: none; }
          @top-right { content: none; }
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          line-height: 1.65;
          font-size: 11pt;
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .header-sheet {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .header-brand {
          font-size: 13pt;
          font-weight: 800;
          color: #4f46e5;
          letter-spacing: -0.02em;
        }

        .header-date {
          font-size: 9pt;
          color: #64748b;
        }

        h1.sheet-title {
          font-size: 20pt;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.25;
        }

        .sheet-subtitle {
          font-size: 11pt;
          color: #6366f1;
          font-weight: 600;
          margin: 0 0 18px 0;
        }

        .sheet-body {
          color: #334155;
        }

        .sheet-body h1 {
          font-size: 16pt;
          color: #4f46e5;
          margin-top: 24px;
          margin-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          page-break-after: avoid;
        }

        .sheet-body h2 {
          font-size: 13pt;
          color: #1e293b;
          margin-top: 18px;
          margin-bottom: 8px;
          page-break-after: avoid;
        }

        .sheet-body h3 {
          font-size: 11pt;
          color: #475569;
          margin-top: 14px;
          margin-bottom: 6px;
          page-break-after: avoid;
        }

        .sheet-body p {
          margin: 0 0 10px 0;
          text-align: justify;
        }

        .sheet-body ul, .sheet-body ol {
          margin: 0 0 12px 0;
          padding-left: 20px;
        }

        .sheet-body li {
          margin-bottom: 4px;
        }

        .sheet-body strong {
          color: #0f172a;
          font-weight: 700;
        }

        .sheet-body mark, .sheet-body .ai-highlight {
          background-color: #e0e7ff;
          color: #3730a3;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .sheet-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 14px 0;
          font-size: 10pt;
          page-break-inside: avoid;
        }

        .sheet-body th, .sheet-body td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          text-align: left;
        }

        .sheet-body th {
          background-color: #f1f5f9;
          font-weight: 700;
          color: #1e293b;
        }

        .sheet-body figure, .sheet-body .resume-figure {
          margin: 14px auto;
          text-align: center;
          page-break-inside: avoid;
        }

        .sheet-body img {
          max-width: 80%;
          max-height: 380px;
          height: auto;
          margin: 0 auto;
          display: block;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          page-break-inside: avoid;
        }

        .sheet-body figcaption {
          font-size: 8.5pt;
          color: #64748b;
          margin-top: 5px;
          font-style: italic;
          text-align: center;
        }

        .footer-sheet {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 8.5pt;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="header-sheet">
        <div class="header-brand">${headerBrand}</div>
        <div class="header-date">${headerMeta}</div>
      </div>

      <h1 class="sheet-title">${title}</h1>
      ${cleanSubtitle ? `<div class="sheet-subtitle">${cleanSubtitle}</div>` : ''}

      <div class="sheet-body">
        ${content}
      </div>

      ${!isPremium ? `
        <div class="footer-sheet">
          <span>Fiche d'étude active • Plateforme SofIA</span>
          <span>www.sofia-learning.com</span>
        </div>
      ` : `
        <div class="footer-sheet" style="display: none;"></div>
      `}
    </body>
    </html>
  `;

  doc.open();
  doc.write(printHtml);
  doc.close();

  // Wait for images and KaTeX fonts to load inside iframe
  setTimeout(() => {
    printIframe.contentWindow?.focus();
    printIframe.contentWindow?.print();

    // Clean up iframe after print dialog completes
    setTimeout(() => {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 1500);
  }, 350);
}
