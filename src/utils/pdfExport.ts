import DOMPurify from 'dompurify';

interface PDFExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
}

/**
 * Convert markdown to styled HTML for PDF export
 */
function markdownToStyledHTML(markdown: string, options: PDFExportOptions): string {
  const accentColor = options.accentColor || '#2563eb';

  // Basic markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*?<\/li>)(\s*<br>\s*)?(<li>)/g, '$1$3');
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  html = DOMPurify.sanitize(html);

  // Process tables
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match, headerRow, bodyRows) => {
    const headers = headerRow.split('|').filter((h: string) => h.trim()).map((h: string) => `<th>${h.trim()}</th>`).join('');
    const rows = bodyRows.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          max-width: 100%;
          margin: 0;
          padding: 40px 50px;
          line-height: 1.7;
          color: #333;
          font-size: 11pt;
        }
        h1 {
          color: #1a1a1a;
          border-bottom: 3px solid ${accentColor};
          padding-bottom: 12px;
          margin-bottom: 24px;
          font-size: 24pt;
          font-weight: 700;
        }
        h2 {
          color: ${accentColor};
          margin-top: 32px;
          margin-bottom: 16px;
          font-size: 16pt;
          font-weight: 600;
          border-left: 4px solid ${accentColor};
          padding-left: 12px;
        }
        h3 {
          color: #444;
          margin-top: 24px;
          margin-bottom: 12px;
          font-size: 13pt;
          font-weight: 600;
        }
        p {
          margin: 12px 0;
        }
        ul, ol {
          margin: 16px 0;
          padding-left: 28px;
        }
        li {
          margin: 8px 0;
        }
        blockquote {
          border-left: 4px solid ${accentColor};
          margin: 20px 0;
          padding: 12px 20px;
          background: #f8fafc;
          font-style: italic;
          color: #555;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 10pt;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #374151;
        }
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 10pt;
        }
        strong {
          font-weight: 600;
          color: #1a1a1a;
        }
        .header-banner {
          background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd);
          color: white;
          padding: 24px 30px;
          margin: -40px -50px 30px -50px;
          text-align: center;
        }
        .header-banner h1 {
          color: white;
          border: none;
          margin: 0;
          padding: 0;
          font-size: 22pt;
        }
        .header-banner p {
          margin: 8px 0 0 0;
          opacity: 0.9;
          font-size: 11pt;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          font-size: 9pt;
          color: #888;
        }
        @page {
          margin: 0.75in;
        }
      </style>
    </head>
    <body>
      <div class="header-banner">
        <h1>${options.title}</h1>
        ${options.subtitle ? `<p>${options.subtitle}</p>` : ''}
      </div>
      <div class="content">
        ${html}
      </div>
      <div class="footer">
        Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Powered by AI
      </div>
    </body>
    </html>
  `;
}

/**
 * Export markdown content as a PDF file
 */
export async function exportToPDF(
  markdownContent: string,
  options: PDFExportOptions
): Promise<void> {
  const styledHTML = markdownToStyledHTML(markdownContent, options);

  const element = document.createElement('div');
  element.innerHTML = styledHTML;
  document.body.appendChild(element);

  const pdfOptions = {
    margin: 0,
    filename: options.filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait' as const
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf().set(pdfOptions).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}

/**
 * Export SOP document as PDF
 */
export async function exportSOPToPDF(
  content: string,
  processName: string
): Promise<void> {
  const filename = `SOP-${processName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

  await exportToPDF(content, {
    filename,
    title: processName,
    subtitle: 'Standard Operating Procedure',
    accentColor: '#d07e3b' // Primary brand color
  });
}

/**
 * Export Proposal document as PDF
 */
export async function exportProposalToPDF(
  content: string,
  projectName: string,
  clientName: string
): Promise<void> {
  const filename = `Proposal-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

  await exportToPDF(content, {
    filename,
    title: projectName,
    subtitle: `Proposal for ${clientName}`,
    accentColor: '#059669' // Emerald color for proposals
  });
}
