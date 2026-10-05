import katex from 'katex';

/**
 * Robust Markdown table parser that converts markdown tables into styled HTML tables
 */
export const parseMarkdownTables = (text: string): string => {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  const isDelimiterRow = (str: string) => {
    const trimmed = str.trim();
    if (!trimmed.includes('|') || !trimmed.includes('--')) return false;
    const parts = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|');
    return parts.length >= 1 && parts.every(p => /^\s*:?-{2,}:?\s*$/.test(p));
  };

  const isTableRow = (str: string) => {
    const trimmed = str.trim();
    return trimmed.includes('|') && !trimmed.startsWith('#');
  };

  const parseCells = (row: string) => {
    let clean = row.trim();
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map(c => c.trim());
  };

  while (i < lines.length) {
    const currentLine = lines[i];
    const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';

    if (isTableRow(currentLine) && isDelimiterRow(nextLine)) {
      const headerRow = currentLine;
      const delimiterRow = nextLine;

      const delimiterCells = parseCells(delimiterRow);
      const alignments = delimiterCells.map(cell => {
        const c = cell.trim();
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        if (c.startsWith(':')) return 'left';
        return 'left';
      });

      const headerCells = parseCells(headerRow);

      i += 2; // skip header & delimiter

      const bodyRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isDelimiterRow(lines[i])) {
        if (lines[i].trim() === '') break;
        bodyRows.push(parseCells(lines[i]));
        i++;
      }

      let tableHtml = '<div class="table-container">\n  <table class="sofia-table">\n    <thead>\n      <tr>\n';
      headerCells.forEach((h, idx) => {
        const align = alignments[idx] || 'left';
        tableHtml += `        <th style="text-align: ${align};">${h}</th>\n`;
      });
      tableHtml += '      </tr>\n    </thead>\n    <tbody>\n';

      bodyRows.forEach(row => {
        tableHtml += '      <tr>\n';
        headerCells.forEach((_, idx) => {
          const cell = row[idx] !== undefined ? row[idx] : '';
          const align = alignments[idx] || 'left';
          tableHtml += `        <td style="text-align: ${align};">${cell}</td>\n`;
        });
        tableHtml += '      </tr>\n';
      });

      tableHtml += '    </tbody>\n  </table>\n</div>';
      result.push(tableHtml);
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
};

// Clean, robust markdown and HTML parser for Sof.IA with LaTeX and Tables support
export const mdToHtml = (md: string) => {
  if (!md || !md.trim()) return '';

  let html = md;

  // 1. Check if content is already rich HTML (from WYSIWYG editor or SelectionToolbar)
  const isAlreadyHtml = /^<[a-z1-6]+/i.test(html.trim()) || /<(p|h[1-6]|div|mark|span|strong|b|u|em|i|ul|ol|li|br|img|table|thead|tbody|tr|th|td)/i.test(html);

  if (isAlreadyHtml) {
    // If it's already HTML, return it directly without escaping or re-parsing
    return html;
  }

  // 2. Process Block Math ($$ ... $$)
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return `<div class="math-block" style="margin: 1rem 0; display: flex; justify-content: center; overflow-x: auto;">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) { return `$$${tex}$$`; }
  });

  // 3. Process Inline Math ($ ... $)
  html = html.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch (e) { return `$${tex}$`; }
  });

  // 4. Process Markdown Tables
  html = parseMarkdownTables(html);

  // 5. Convert Raw Markdown to HTML
  // Headers
  html = html.replace(/^\s*#### (.*?)\s*\r?$/gim, '<h4 style="margin: 0.75rem 0 0.25rem; font-weight: 700;">$1</h4>');
  html = html.replace(/^\s*### (.*?)\s*\r?$/gim, '<h3 style="margin: 1rem 0 0.5rem; color: var(--accent-primary); font-size: 1.1rem;">$1</h3>');
  html = html.replace(/^\s*## (.*?)\s*\r?$/gim, '<h2 style="margin: 1.5rem 0 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3rem;">$1</h2>');
  html = html.replace(/^\s*# (.*?)\s*\r?$/gim, '<h1 style="margin: 2rem 0 1rem; font-size: 1.5rem;">$1</h1>');

  // Lists
  html = html.replace(/^\s*[\*\-] (.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.25rem;">$1</li>');

  // Inline formatting
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<u style="text-decoration: underline;">$1</u>');
  html = html.replace(/([^\*]|^)\*([^\*]+)\*(?!\*)/gim, '$1<em>$2</em>');
  
  // Highlights
  // Custom color highlight ==color:text==
  html = html.replace(/==(#[\w]+|rgba?\([^)]+\)):(.*?)==/gim, '<mark style="background-color: $1; color: inherit; padding: 0.12em 0.35em; border-radius: 0.35em;">$2</mark>');
  // Default glass blue highlight (replaces the yellow #fef08a)
  html = html.replace(/==(.*?)==/gim, '<mark class="ai-highlight" style="background-color: rgba(56, 189, 248, 0.18); color: #0284c7; border: 1px solid rgba(56, 189, 248, 0.28); padding: 0.12em 0.35em; border-radius: 0.35em; font-weight: 600;">$1</mark>');

  // Paragraphs
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    if (
      trimmed.startsWith('<h') || 
      trimmed.startsWith('<ul') || 
      trimmed.startsWith('<ol') || 
      trimmed.startsWith('<li') || 
      trimmed.startsWith('<hr') || 
      trimmed.startsWith('<div') || 
      trimmed.startsWith('<table') ||
      trimmed.startsWith('<thead') ||
      trimmed.startsWith('<tbody') ||
      trimmed.startsWith('<tr') ||
      trimmed.startsWith('<th') ||
      trimmed.startsWith('<td') ||
      trimmed.startsWith('</') ||
      trimmed.startsWith('<p')
    ) {
      return line;
    }
    return `<p style="margin-bottom: 0.75rem;">${trimmed}</p>`;
  }).filter(l => l !== '').join('\n');

  return html;
};
