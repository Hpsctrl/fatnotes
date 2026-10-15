import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Download, Sparkles, FileText, ChevronLeft } from 'lucide-react';
import './QuestionPaperRenderer.css';

interface QuestionPaperRendererProps {
  rawContent: string;
  paperTitle: string;
  isGenerating?: boolean;
  onBackToEditor?: () => void;
}

export const QuestionPaperRenderer: React.FC<QuestionPaperRendererProps> = ({
  rawContent,
  paperTitle,
  isGenerating = false,
  onBackToEditor,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Split raw markdown into Question Paper vs Marking Scheme
  const parseSections = () => {
    let paperPart = rawContent;
    let solutionsPart = '';

    const splitMarker = '<!-- MARKING_SCHEME_START -->';
    if (rawContent.includes(splitMarker)) {
      const parts = rawContent.split(splitMarker);
      paperPart = parts[0].trim();
      solutionsPart = parts[1].replace('<!-- PAPER_END -->', '').trim();
    } else if (rawContent.includes('# MARKING SCHEME')) {
      const parts = rawContent.split(/#\s+MARKING SCHEME/i);
      paperPart = parts[0].trim();
      solutionsPart = ('# MARKING SCHEME' + parts[1]).replace('<!-- PAPER_END -->', '').trim();
    }

    return { paperPart, solutionsPart };
  };

  const { paperPart, solutionsPart } = parseSections();

  const handleExportPDF = async () => {
    if (!sheetRef.current) return;
    try {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 50));

      const cleanTitle = (paperTitle || 'Examination_Paper').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
      const filename = `${cleanTitle}.pdf`;

      const opt: any = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      await html2pdf().set(opt).from(sheetRef.current).save();
    } catch (err) {
      console.error('Error generating Question Paper PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="qp-renderer-root">
      {/* ─── Clean Header with Single Export Button ─── */}
      <div className="panel-header preview-header">
        <div className="panel-title">
          {onBackToEditor && (
            <button
              type="button"
              className="mobile-back-to-gen-btn"
              onClick={onBackToEditor}
              title="Back to Generator"
            >
              <ChevronLeft size={16} />
              <span>Edit</span>
            </button>
          )}
          <FileText size={16} />
          <span>Exam Paper</span>
        </div>
        <button
          id="export-pdf-btn"
          className="btn-primary"
          onClick={handleExportPDF}
          disabled={isExporting || isGenerating}
        >
          {isExporting ? <Sparkles size={14} className="animate-pulse" /> : <Download size={14} />}
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {/* ─── Scrollable Paper Viewport (Auto-detects Paper + Marking Scheme) ─── */}
      <div className="qp-viewport">
        <div
          ref={sheetRef}
          className="qp-sheet theme-classic-white"
        >
          {/* Header Roll No Box */}
          <div className="qp-roll-box-wrap">
            <span>Candidate Roll No: </span>
            <div className="qp-roll-boxes">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="qp-roll-box" />
              ))}
            </div>
          </div>

          {/* Auto-detected Combined Content */}
          <div className="qp-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {paperPart}
            </ReactMarkdown>

            {solutionsPart && (
              <>
                <div className="html2pdf__page-break" style={{ height: '2rem' }} />
                <div className="qp-solution-banner">
                  <div className="qp-solution-title">MARKING SCHEME & STEP-BY-STEP SOLUTIONS</div>
                  <div className="qp-solution-subtitle">Point-Wise Marks Distribution Rubric</div>
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {solutionsPart}
                </ReactMarkdown>
              </>
            )}
          </div>

          {/* Sheet Footer */}
          <div className="qp-sheet-footer">
            <span>{paperTitle || 'Examination Paper'}</span>
            <span>— END OF EXAMINATION PAPER —</span>
            <span>Page 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

