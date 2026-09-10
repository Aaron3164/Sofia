import katex from 'katex';

// Simple markdown to HTML parser for Sof.IA with LaTeX support
export const mdToHtml = (md: string) => {
  if (!md) return '';
  
  let html = md;

  // 1. Handle Block Math ($$ ... $$)
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return `<div style="margin: 1rem 0; display: flex; justify-content: center;">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return `<code>${tex}</code>`;
    }
  });

  // 2. Handle Inline Math ($ ... $)
  // We use a negative lookbehind/lookahead logic (simplified) to avoid matching empty $ or escaped ones
  html = html.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch (e) {
      return `<code>${tex}</code>`;
    }
  });

  // 3. Basic escaping of remaining < and > (outside of our generated HTML)
  // Actually, we should probably escape first, but KaTeX needs the original TeX.
  // So we escape ONLY if it's not inside a KaTeX span/div.
  // This is a bit complex for a regex parser. Let's do a simpler approach:
  // We'll replace < and > in the RAW markdown BEFORE math processing, 
  // but we must be careful not to break the math. 
  // LaTeX usually doesn't use < and > for logic (it uses \lt and \gt).
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Re-run the math replacement because we just escaped the < and > in the KaTeX output if we ran it before.
  // Correct order: 
  // A. Escape the raw text (except $)
  // B. Render Math
  
  // Let's reset and do it right:
  let finalMd = md.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Block Math
  finalMd = finalMd.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return `<div class="math-block" style="margin: 1rem 0; display: flex; justify-content: center; overflow-x: auto;">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) { return `$$${tex}$$`; }
  });

  // Inline Math
  finalMd = finalMd.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch (e) { return `$${tex}$`; }
  });

  html = finalMd;

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
  html = html.replace(/==(.*?)==/gim, '<mark>$1</mark>');
  
  // Paragraphs
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    // Skip wrapping if it's already a structural element
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<hr') || trimmed.startsWith('<div')) {
      return line; 
    }
    return `<p style="margin-bottom: 0.75rem;">${trimmed}</p>`;
  }).filter(l => l !== '').join('\n');
  
  return html;
};
