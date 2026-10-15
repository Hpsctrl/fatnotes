import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * High-Fidelity Multi-Page PDF Exporter with Dark Aesthetic Liquid Glass Theme.
 * 
 * Why this is immune to blank pages:
 * 1. html2pdf.js / html2canvas fails on long documents (e.g. 37 pages) because
 *    creating a single canvas of 70,000+ px exceeds the browser's max canvas dimension (16,384px),
 *    causing Chrome to silently produce a 100% blank canvas.
 * 2. html2pdf.js 'avoid-all' mode inserts hundreds of page breaks for every DOM node,
 *    corrupting layout into dozens of empty pages.
 * 
 * This engine paginates the markdown elements into discrete A4 page containers (height ~1130px),
 * renders each page INDIVIDUALLY to an isolated canvas (only 1600x2260px at 2x scale),
 * and streams each page into a vector jsPDF document with the gorgeous black blurry aesthetic theme.
 */

export interface ExportPdfOptions {
  sourceElement: HTMLElement;
  filename: string;
  topicTitle: string;
  onProgress?: (message: string) => void;
}

export async function exportNotesToAestheticPdf({
  sourceElement,
  filename,
  topicTitle,
  onProgress,
}: ExportPdfOptions): Promise<void> {
  // Target A4 aspect ratio at 800px width:
  // Standard A4: 595.28 x 841.89 pt (ratio 1.4142)
  // 800px width -> 1131px height
  const PAGE_WIDTH = 800;
  const PAGE_HEIGHT = 1132;
  const PADDING_V = 44;
  const PADDING_H = 48;
  const HEADER_HEIGHT = 38;
  const FOOTER_HEIGHT = 34;

  // Usable height for content blocks on each page:
  const MAX_CONTENT_HEIGHT = PAGE_HEIGHT - (PADDING_V * 2) - HEADER_HEIGHT - FOOTER_HEIGHT; // ~970px

  onProgress?.('Preparing high-res pages...');

  // Create an off-screen staging area in the live DOM
  // Using left: -9999px with opacity: 1 ensures html2canvas can measure and render everything
  const stage = document.createElement('div');
  stage.id = 'pdf-render-stage';
  stage.style.position = 'fixed';
  stage.style.top = '0';
  stage.style.left = '-9999px';
  stage.style.width = `${PAGE_WIDTH}px`;
  stage.style.zIndex = '-9999';
  stage.style.opacity = '1';
  stage.style.pointerEvents = 'none';
  document.body.appendChild(stage);

  // Helper to build a styled dark-theme page container
  const createPageContainer = (pageNumber: number): { pageEl: HTMLElement; contentEl: HTMLElement; footerEl: HTMLElement } => {
    const page = document.createElement('div');
    page.style.width = `${PAGE_WIDTH}px`;
    page.style.height = `${PAGE_HEIGHT}px`;
    page.style.boxSizing = 'border-box';
    page.style.padding = `${PADDING_V}px ${PADDING_H}px`;
    page.style.position = 'relative';
    page.style.display = 'flex';
    page.style.flexDirection = 'column';
    page.style.overflow = 'hidden';
    page.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    page.style.color = '#eef4fb';
    
    // Aesthetic black blurry / liquid glass background
    page.style.background = 'radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.18), transparent 38%), linear-gradient(145deg, #07090e 0%, #0e141c 52%, #10151b 100%)';
    page.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    page.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.15)';

    // Clean Minimal Page Header (Only show title if available, NO branding/watermarks)
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.height = `${HEADER_HEIGHT}px`;
    header.style.marginBottom = '14px';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
    header.style.paddingBottom = '8px';
    header.style.fontSize = '11px';
    header.style.fontWeight = '600';
    header.style.letterSpacing = '0.03em';
    header.style.color = '#94a3b8';

    const headerTitle = document.createElement('span');
    headerTitle.style.maxWidth = '700px';
    headerTitle.style.overflow = 'hidden';
    headerTitle.style.textOverflow = 'ellipsis';
    headerTitle.style.whiteSpace = 'nowrap';
    headerTitle.innerText = topicTitle.replace(/_/g, ' ');

    header.appendChild(headerTitle);
    page.appendChild(header);

    // Page Content Body
    const content = document.createElement('div');
    content.className = 'pdf-page-content';
    content.style.flex = '1';
    content.style.minHeight = '0';
    content.style.overflow = 'hidden';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '10px';
    content.style.fontSize = '14.5px';
    content.style.lineHeight = '1.6';
    page.appendChild(content);

    // Page Footer (Only clean subtle page number, NO app branding/watermarks)
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.alignItems = 'center';
    footer.style.height = `${FOOTER_HEIGHT}px`;
    footer.style.marginTop = 'auto';
    footer.style.paddingTop = '8px';
    footer.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
    footer.style.fontSize = '11px';
    footer.style.color = '#64748b';
    footer.style.fontWeight = '500';

    const footerRight = document.createElement('span');
    footerRight.className = 'pdf-page-number';
    footerRight.innerText = `${pageNumber}`;

    footer.appendChild(footerRight);
    page.appendChild(footer);

    return { pageEl: page, contentEl: content, footerEl: footerRight };
  };

  // Helper to deep style cloned markdown nodes so they look razor sharp on the dark theme
  const applyDarkThemeStyles = (node: HTMLElement) => {
    const tag = node.tagName.toLowerCase();
    
    if (tag === 'h1') {
      node.style.color = '#ffffff';
      node.style.fontSize = '23px';
      node.style.fontWeight = '800';
      node.style.margin = '10px 0 6px 0';
      node.style.lineHeight = '1.25';
      node.style.letterSpacing = '-0.01em';
      node.style.borderBottom = '1.5px solid rgba(255, 255, 255, 0.15)';
      node.style.paddingBottom = '6px';
    } else if (tag === 'h2') {
      node.style.color = '#ffffff';
      node.style.fontSize = '18.5px';
      node.style.fontWeight = '700';
      node.style.margin = '14px 0 6px 0';
      node.style.lineHeight = '1.3';
    } else if (tag === 'h3') {
      node.style.color = '#93c5fd';
      node.style.fontSize = '15.5px';
      node.style.fontWeight = '700';
      node.style.margin = '10px 0 4px 0';
    } else if (tag === 'p') {
      node.style.color = '#dbe5ee';
      node.style.margin = '0 0 8px 0';
      node.style.lineHeight = '1.6';
    } else if (tag === 'ul' || tag === 'ol') {
      node.style.color = '#dbe5ee';
      node.style.paddingLeft = '22px';
      node.style.margin = '0 0 10px 0';
    } else if (tag === 'li') {
      node.style.color = '#dbe5ee';
      node.style.marginBottom = '5px';
      node.style.lineHeight = '1.55';
    } else if (tag === 'table') {
      node.style.width = '100%';
      node.style.borderCollapse = 'collapse';
      node.style.margin = '10px 0';
      node.style.borderRadius = '8px';
      node.style.overflow = 'hidden';
      node.style.background = 'rgba(255, 255, 255, 0.03)';
      node.style.fontSize = '13px';
    } else if (tag === 'th') {
      node.style.background = 'rgba(255, 255, 255, 0.09)';
      node.style.color = '#ffffff';
      node.style.fontWeight = '800';
      node.style.padding = '8px 10px';
      node.style.border = '1px solid rgba(255, 255, 255, 0.12)';
      node.style.textAlign = 'left';
    } else if (tag === 'td') {
      node.style.color = '#dbe5ee';
      node.style.padding = '7px 10px';
      node.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    } else if (tag === 'code') {
      node.style.fontFamily = "'Cascadia Code', Consolas, monospace";
      node.style.background = 'rgba(255, 255, 255, 0.10)';
      node.style.color = '#edf6ff';
      node.style.padding = '2px 5px';
      node.style.borderRadius = '4px';
      node.style.fontSize = '0.92em';
    } else if (tag === 'pre') {
      node.style.background = 'rgba(0, 0, 0, 0.45)';
      node.style.border = '1px solid rgba(255, 255, 255, 0.12)';
      node.style.borderRadius = '8px';
      node.style.padding = '12px 14px';
      node.style.overflow = 'hidden';
      node.style.margin = '10px 0';
    } else if (tag === 'blockquote') {
      node.style.borderLeft = '3px solid #3b82f6';
      node.style.paddingLeft = '14px';
      node.style.margin = '10px 0';
      node.style.color = '#94a3b8';
      node.style.fontStyle = 'italic';
    } else if (tag === 'strong' || tag === 'b') {
      node.style.color = '#ffffff';
      node.style.fontWeight = '700';
    } else if (tag === 'hr') {
      node.style.border = 'none';
      node.style.borderTop = '1px solid rgba(255, 255, 255, 0.12)';
      node.style.margin = '14px 0';
    }

    // Recursively apply to children
    for (let i = 0; i < node.children.length; i++) {
      applyDarkThemeStyles(node.children[i] as HTMLElement);
    }
  };

  try {
    // 1. Collect all source markdown elements
    const elementsToPaginate: HTMLElement[] = [];
    const sourceChildren = Array.from(sourceElement.children) as HTMLElement[];
    
    sourceChildren.forEach(child => {
      elementsToPaginate.push(child);
    });

    if (elementsToPaginate.length === 0) {
      throw new Error('No content found to export.');
    }

    const pages: { pageEl: HTMLElement; footerEl: HTMLElement }[] = [];
    let current = createPageContainer(1);
    stage.appendChild(current.pageEl);
    pages.push({ pageEl: current.pageEl, footerEl: current.footerEl });

    // 2. Intelligent Pagination Algorithm
    for (let elIdx = 0; elIdx < elementsToPaginate.length; elIdx++) {
      const srcEl = elementsToPaginate[elIdx];
      const tag = srcEl.tagName.toLowerCase();

      // For lists, we can split by list-items across pages for zero wasted space
      if (tag === 'ul' || tag === 'ol') {
        let currentList = document.createElement(tag) as HTMLElement;
        applyDarkThemeStyles(currentList);
        current.contentEl.appendChild(currentList);

        const listItems = Array.from(srcEl.children) as HTMLElement[];
        for (const li of listItems) {
          const liClone = li.cloneNode(true) as HTMLElement;
          applyDarkThemeStyles(liClone);
          currentList.appendChild(liClone);

          // If list item pushes content over the page boundary
          if (current.contentEl.scrollHeight > MAX_CONTENT_HEIGHT && currentList.children.length > 1) {
            currentList.removeChild(liClone);

            // New page
            current = createPageContainer(pages.length + 1);
            stage.appendChild(current.pageEl);
            pages.push({ pageEl: current.pageEl, footerEl: current.footerEl });

            // Create continuing list
            currentList = document.createElement(tag) as HTMLElement;
            applyDarkThemeStyles(currentList);
            current.contentEl.appendChild(currentList);
            currentList.appendChild(liClone);
          }
        }
      } else {
        // Standard block (h1, h2, h3, p, table, blockquote, pre)
        const clone = srcEl.cloneNode(true) as HTMLElement;
        applyDarkThemeStyles(clone);
        current.contentEl.appendChild(clone);

        // Check if this block pushed past the bottom of the page
        if (current.contentEl.scrollHeight > MAX_CONTENT_HEIGHT && current.contentEl.children.length > 1) {
          // Move this block to the next page
          current.contentEl.removeChild(clone);

          current = createPageContainer(pages.length + 1);
          stage.appendChild(current.pageEl);
          pages.push({ pageEl: current.pageEl, footerEl: current.footerEl });

          current.contentEl.appendChild(clone);
        }
      }
    }

    // Update all page footers with total pages count (e.g. "3 / 12")
    const totalPages = pages.length;
    pages.forEach((p, idx) => {
      p.footerEl.innerText = `${idx + 1} / ${totalPages}`;
    });

    onProgress?.(`Rendering ${totalPages} pages...`);

    // 3. Render each page individually with html2canvas and assemble into jsPDF
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    const A4_WIDTH_PT = 595.28;
    const A4_HEIGHT_PT = 841.89;

    for (let i = 0; i < pages.length; i++) {
      onProgress?.(`⚡ Rendering page ${i + 1} of ${totalPages}...`);
      
      // html2canvas renders only this single page: 800 x 1132 -> at scale 2 = 1600 x 2264 px
      // Well within browser limits (16,384px), guarantees crisp text & zero blank pages!
      const canvas = await html2canvas(pages[i].pageEl, {
        scale: 2,
        backgroundColor: '#07090e',
        useCORS: true,
        logging: false,
        windowWidth: PAGE_WIDTH,
        windowHeight: PAGE_HEIGHT,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.94);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, undefined, 'FAST');
    }

    onProgress?.('Saving PDF...');
    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalFilename);
  } finally {
    // Clean up staging container from DOM
    if (stage.parentNode) {
      stage.parentNode.removeChild(stage);
    }
  }
}
