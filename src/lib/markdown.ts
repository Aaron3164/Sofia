import katex from 'katex';

// Clean, robust markdown and HTML parser for Sof.IA with LaTeX support
export const mdToHtml = (md: string) => {
  if (!md || !md.trim()) return '';

  let html = md;

  // 1. Check if content is already rich HTML (from WYSIWYG editor or SelectionToolbar)
  const isAlreadyHtml = /^<[a-z1-6]+/i.test(html.trim()) || /<(p|h[1-6]|div|mark|span|strong|b|u|em|i|ul|ol|li|br|img)/i.test(html);

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

  // 4. Convert Raw Markdown to HTML
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
  html = html.replace(/==(#[\w]+|rgba?\([^)]+\)):(.*?)==/gim, '<mark style="background-color: $1; color: inherit; padding: 0.15em 0.35em; border-radius: 0.25em;">$2</mark>');
  html = html.replace(/==(.*?)==/gim, '<mark style="background-color: #fef08a; color: #854d0e; padding: 0.15em 0.35em; border-radius: 0.25em;">$1</mark>');

  // Paragraphs
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('<hr') || trimmed.startsWith('<div') || trimmed.startsWith('<p')) {
      return line;
    }
    return `<p style="margin-bottom: 0.75rem;">${trimmed}</p>`;
  }).filter(l => l !== '').join('\n');

  return html;
};
