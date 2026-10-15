import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Download, Sparkles, FileText, UploadCloud, Settings, CheckCircle2, AlertCircle, Zap, BookOpen, X, Trash2, Plus, ShieldCheck, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionPaperRenderer } from './components/QuestionPaperRenderer';
import { detectLanguageFromContent, buildSyllabusAuditPrompt, parseAuditResponse, type AuditMetadata, type DetectedLanguage } from './services/syllabusAuditService';
import { exportNotesToAestheticPdf } from './services/pdfExportService';
import './App.css';

/* --- Animated Background Grid Component --- */
const BackgroundGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    let animationFrameId: number;

    const render = () => {
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.fillStyle = '#eef2f6'; // off-white background so pure white glass highlights show up
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1;
      const gridSize = 150; // larger boxes
      const panSpeed = 0.6;
      
      const offsetX = (time * panSpeed) % gridSize;
      const offsetY = (time * panSpeed) % gridSize;

      ctx.beginPath();
      for (let x = -gridSize + offsetX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = -gridSize + offsetY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      
      // dark stroke for grid lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.stroke();

      time += 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="liquid-anim-bg" 
      style={{ 
        position: 'fixed', 
        top: 0, left: 0, 
        width: '100vw', height: '100vh', 
        zIndex: -2, 
        pointerEvents: 'none' 
      }} 
    />
  );
};

// ─── PDF Text Extraction (for Groq, which doesn't support inline binary) ──────
// @ts-ignore – Vite ?url import gives us a resolved asset path
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { PDFDocument } from 'pdf-lib';

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }
  return fullText;
}

// ─── Smart In-App PDF & Image Compressor (Preserves Text Sharpness) ───────────
async function compressPdfSmartly(
  file: File,
  onProgress?: (msg: string) => void
): Promise<File> {
  // If file is already under 12 MB, no compression needed
  if (file.size <= 12 * 1024 * 1024) return file;

  onProgress?.(`⚡ Smart-compressing document (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const newPdfDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (i % 2 === 0 || i === 1 || i === numPages) {
      onProgress?.(`⚡ Smart-compressing page ${i} of ${numPages} (keeping text crisp)...`);
    }
    const page = await pdf.getPage(i);

    // Target max resolution of ~1400px ensures text, diagrams, and small annotations stay 100% sharp
    const baseViewport = page.getViewport({ scale: 1.0 });
    const maxDim = Math.max(baseViewport.width, baseViewport.height);
    const targetDim = Math.min(maxDim, 1400);
    const scale = maxDim > 0 ? targetDim / maxDim : 1.0;
    const viewport = page.getViewport({ scale: Math.max(scale, 1.0) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    // Solid white background prevents dark transparent artifacts
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport } as any).promise;

    // 0.80 JPEG quality drops 85-90% of bloat without visible text degradation
    const jpgBlob: Blob = await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/jpeg', 0.80);
    });

    const jpgBytes = await jpgBlob.arrayBuffer();
    const embeddedJpg = await newPdfDoc.embedJpg(jpgBytes);

    const newPage = newPdfDoc.addPage([canvas.width, canvas.height]);
    newPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
  }

  const compressedPdfBytes = await newPdfDoc.save();
  const compressedFile = new File([compressedPdfBytes.buffer as ArrayBuffer], file.name, { type: 'application/pdf' });

  const originalMb = (file.size / (1024 * 1024)).toFixed(1);
  const newMb = (compressedFile.size / (1024 * 1024)).toFixed(1);
  onProgress?.(`✅ Smart-compressed from ${originalMb} MB down to ${newMb} MB! Text and illustrations preserved.`);

  return compressedFile;
}

async function compressImageSmartly(file: File): Promise<File> {
  if (file.size <= 8 * 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 2000;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      } else {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// ─── Types & Constants ────────────────────────────────────────────────────────
type AIProvider = 'gemini' | 'groq' | 'openrouter';

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', maxInputChars: 30000 },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)', maxInputChars: 50000 },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', maxInputChars: 40000 },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (low free limit)', maxInputChars: 12000 },
] as const;

const OPENROUTER_MODELS = [
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', maxInputChars: 100000 },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', maxInputChars: 200000 },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', maxInputChars: 150000 },
  { id: 'openrouter/auto', label: 'Auto (Best for Price)', maxInputChars: 50000 },
] as const;

const DEFAULT_NOTE = `# Upload a PDF or Image & Generate Notes or Question Papers!

Welcome to **AesthetNote** — your versatile AI study & examination assistant.

1. Choose your **AI Provider** in settings (top right) — Gemini, Groq, or OpenRouter.
2. Enter your **API Key** for the selected provider.
3. Upload a **PDF** or **Image** (textbook page, handwritten notes, syllabus, etc.) or just type any topic.
4. Tell the AI **exactly what you need** in the instructions box:
   - 📋 *"Make a 50-mark question paper with 1-marker MCQs, 2-marker, 3-marker, and 5-marker questions"*
   - 📝 *"Create a 20-mark unit test on Chapter 2 with complete marking scheme & answers"*
   - 📖 *"Comprehensive study notes for Unit 2 in simple language"*
   - 💡 *"Detailed stanza-by-stanza poem explanation with literary devices"*
5. Hit **Generate** — the AI automatically switches into Exam Paper mode for tests and Study Notes mode for revision!

---

### 💡 You can ask for ANYTHING:
- *"CBSE pattern 80-mark board question paper for Class 10 Science"*
- *"10-mark quick quiz with 1-mark MCQs"*
- *"List all definitions and formulas from Unit 3"*
- *"Difference between TCP and UDP — create a comparison table"*
- Or paste a YouTube link to make notes from video!`;

const isQuestionPaperContent = (text: string): boolean => {
  if (!text) return false;
  return (
    text.includes('<!-- MARKING_SCHEME_START -->') ||
    text.includes('GENERAL INSTRUCTIONS') ||
    (text.includes('SECTION - A') && text.includes('Maximum Marks:')) ||
    (text.includes('SECTION A') && text.includes('Maximum Marks:')) ||
    text.includes('Candidate Roll No:')
  );
};

const SYSTEM_INSTRUCTIONS = (userPrompt: string, detectedLanguage: DetectedLanguage = 'english') => {
  const languageDirective =
    detectedLanguage === 'english'
      ? `=== 🌐 STRICT MANDATORY LANGUAGE DIRECTIVE: 100% ENGLISH ===
- You MUST write the ENTIRE notes or examination paper 100% in ENGLISH.
- NEVER generate explanations, headings, definitions, or notes in Hindi, Hinglish, or Devanagari script.
- Even if the source material or topic mentions Indian history, literature, poems, or NCERT concepts (e.g. Kabir, Rahim, Indian freedom struggle, CBSE syllabus), all explanations, summaries, and notes MUST be in English.
- If source literature contains Hindi verses/poetry, quote the line if necessary, but provide immediate English meanings and 100% English explanations.
- Outputting unauthorized Hindi or Hinglish when English is specified is a FATAL COMPLIANCE FAILURE.`
      : detectedLanguage === 'hindi'
      ? `=== 🌐 MANDATORY LANGUAGE DIRECTIVE: HINDI ===
- Output strictly in clean, modern, accessible Hindi using Devanagari script.
- Keep scientific formulas, symbols, and key technical English terms in brackets where helpful.`
      : `=== 🌐 MANDATORY LANGUAGE DIRECTIVE: HINGLISH ===
- Mix Hindi and English naturally in Latin script, exactly the way modern students speak and study.
- Keep technical terms and formulas clear and sharp.`;

  return `You are an expert, versatile AI Note-Maker and Study Assistant who explains things so simply that even a complete beginner can understand.

=== YOUR GOLDEN RULE ===
ALWAYS use SIMPLE, EASY, ACCESSIBLE language. Write like you're explaining to a friend who knows nothing about the topic.
- No complex jargon without explaining it first.
- Short sentences. Clear words. Real-life examples wherever possible.
- Focus on conceptual clarity, intuition, and exam readiness.

${languageDirective}

=== USER'S EXACT INSTRUCTIONS ===
"${userPrompt || "Generate full, detailed, point-wise study notes for ALL topics mentioned in the document. Cover every topic exhaustively with proper definitions, explanations, formulas, theories, examples, and key points. Use bullet points and numbered lists. Make it exam-ready — the student should be able to pass their exam just by reading these notes."}"
^^^ THIS IS YOUR #1 PRIORITY. DO EXACTLY WHAT THIS SAYS. ^^^

=== ⏰ ABSOLUTE MANDATORY RULE: NEVER MISS ANY DATES, YEARS & TIMELINES ===
- CRITICAL EXAM REQUIREMENT: You MUST include and preserve EVERY single date, year, century, historical era, publication date, birth/death year, timeline event, and chronological marker found in the source documents or topic.
- Format all dates, years, and historical figures in **bold** (e.g. **1861**, **1913**, **23 July 1823 – 26 November 1896**, **Late 19th Century**).
- For literature/poems/authors: ALWAYS explicitly include the author's birth/death dates, Nobel Prize / award years, and the year or historical period in which the text/poem was composed or published.
- For history/events/science: Never generalize or drop years. If a date is mentioned (or contextually known), explicitly state it.
- Include a dedicated "📅 Key Dates & Chronology" or "About the Author & Context" bulleted section whenever dates or biographical years are present.
- Omitting or skipping any date present in the source material is a FATAL ERROR.

=== PRIMARY DEFAULT: STUDY NOTES & CONCEPT EXPLANATIONS (95% of tasks) ===
Unless the user explicitly asks for a "test paper" or "question paper", ALWAYS produce rich, structured study notes:

📝 NOTE TYPES & STYLES YOU CAN PRODUCE:
1. DETAILED STUDY NOTES (Default):
   - Exhaustive topic-by-topic breakdown covering all concepts, formulas, definitions, key points, and examples.
   - Use ## and ### headings, **bold** key terms, bullet points, and numbered lists.
2. CONCEPT EXPLANATIONS:
   - "explain chapter" / "concept breakdown" → Full concept explanation in simple everyday language with real-world analogies.
   - "poem explanation" → Stanza-by-stanza breakdown, line meanings, central theme, literary devices.
   - "passage explanation" → Step-by-step breakdown of passages with vocabulary and context.
3. STUDY AIDS & QUICK REVISION:
   - "summary" / "short notes" → Concise, bullet-pointed summary for fast revision.
   - "comparison table" / "difference between" → Clean Markdown comparison tables.
   - "definitions" / "define terms" → Complete list of terms with crystal-clear definitions.
   - "formulas" / "formula sheet" → Formulas organized by topic with variable units and meanings.
   - "derivations" → Step-by-step mathematical or scientific derivations with reasons.
   - "mind map" / "flowchart" → Indented hierarchical points or step arrows (→).
4. QUESTIONS & ANSWERS (Study Q&A):
   - "important questions" / "Q&A" / "chapter questions" → Important questions with full model answers.

🎓 SPECIAL OCCASION: QUESTION PAPERS & EXAMS (ONLY when explicitly asked) ===
ONLY if the user explicitly asks for a "question paper", "test paper", "exam paper", "mock test", "unit test", "X marks test", or asks for "1-marker, 2-marker, 5-marker test":
- Format as an official examination paper:
  # [INSTITUTION / BOARD NAME]
  ### [EXAMINATION TITLE — e.g. ANNUAL EXAM / MID-TERM 2025–26]
  **Subject:** [Subject] | **Class:** [Grade] | **Paper Code:** [Code]
  **Time Allowed:** [Time] | **Maximum Marks:** [Total Marks]

  ---
  ### GENERAL INSTRUCTIONS:
  1. All questions are compulsory. Internal choice is provided in certain questions.
  2. Section A contains 1-mark questions (MCQs & Objective).
  3. Section B contains 2-mark short answer questions.
  4. Section C contains 3-mark questions.
  5. Section D contains 5-mark long answer questions.
  ---

  ## SECTION - A (Objective Type Questions - 1 Mark each)
  **Q1.** [Question text] [1]
     (A) Option 1
     (B) Option 2
     (C) Option 3
     (D) Option 4

  ## SECTION - B (Very Short Answer Questions - 2 Marks each)
  **Q5.** [Question text] [2]

  ## SECTION - C (Short Answer Questions - 3 Marks each)
  **Q8.** [Question text] [3]
  **OR**
  [Alternative question text] [3]

  ## SECTION - D (Long Answer Questions - 5 Marks each)
  **Q12.** (a) [Sub-question] [2]
  (b) [Sub-question] [2]
  (c) [Sub-question] [1]

  <!-- MARKING_SCHEME_START -->
  # MARKING SCHEME & STEP-BY-STEP SOLUTIONS
  ### Complete Model Answers & Evaluator's Rubric
  **Ans 1:** **(B) Option Name** [1 Mark] - *Reason: [Explanation]*
  **Ans 5:** [Point-wise model answer with step marks]
  <!-- PAPER_END -->

=== GENERAL OUTPUT RULES ===
- Output ONLY clean Markdown. No \`\`\`markdown wrappers. No greeting text.
- The VERY FIRST LINE must be a single # Heading (used for PDF filename).
- ${languageDirective}`;
};

// ─── 3-Way Liquid Provider Switch ────────────────────────────────────────────
const PROVIDERS: AIProvider[] = ['gemini', 'groq', 'openrouter'];

const PROVIDER_META = {
  gemini:     { label: 'Gemini',     Icon: Sparkles,  hue: 215, accent: '#3e6dff' },
  groq:       { label: 'Groq',       Icon: Zap,       hue: 24,  accent: '#f97316' },
  openrouter: { label: 'OpenRouter', Icon: BookOpen,  hue: 200, accent: '#0ea5e9' },
} as const;

function LiquidProviderSwitch({
  provider,
  onChange,
}: {
  provider: AIProvider;
  onChange: (p: AIProvider) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(334);
  const [pressed, setPressed] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setTrackWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setTrackWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!clicked) return;
    const t = window.setTimeout(() => setClicked(false), 350); // Matches spring duration
    return () => window.clearTimeout(t);
  }, [clicked]);

  const { hue } = PROVIDER_META[provider];
  const isMoving = pressed || clicked;

  const tabWidth = trackWidth / 3;
  const knobWidth = Math.max(76, Math.floor(tabWidth - 6));
  const providerIndex = PROVIDERS.indexOf(provider);
  const posX = Math.max(3, Math.min(trackWidth - knobWidth - 3, Math.round(tabWidth * (providerIndex + 0.5) - knobWidth / 2)));

  return (
    <div
      ref={containerRef}
      className="lps-root"
      role="group"
      aria-label="AI Provider"
      style={{ 
        '--hue': hue,
        background: 'rgba(255, 255, 255, 0.95)' // Always white slab
      } as any}
    >
      {/* ── Background Goo layer: the stretchy tail behind text ── */}
      <div className="lps-liquids" style={{ filter: 'url(#goo)' }}>
        {/* Static inset ring so the tail merges smoothly */}
        <div className="lps-ring" />
        
        {/* The liquid blob that stretches when moving */}
        <motion.div
          className="lps-blob-goo"
          animate={{ 
            x: posX,
            width: knobWidth,
            backgroundColor: isMoving ? 'rgba(210, 215, 220, 0.95)' : 'rgba(255, 255, 255, 1)', // Grey when moving
            scaleX: isMoving ? 1.7 : 1, // massive stretch tail
            scaleY: isMoving ? 1.6 : 1  // Massive vertical bulge to overflow the 48px track
          }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          style={{ y: '-50%', originX: 0.5, originY: 0.5 }}
        />
      </div>

      {/* ── Clickable label buttons ── */}
        {PROVIDERS.map((p, i) => {
          const { label, Icon } = PROVIDER_META[p];
          return (
            <button
              key={p}
              id={`provider-${p}-btn`}
              className={`lps-btn lps-btn-${i} ${provider === p ? 'active' : ''}`}
              onClick={() => {
                if (p === provider) return;
                onChange(p);
                setClicked(true);
              }}
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              onMouseLeave={() => setPressed(false)}
              aria-pressed={provider === p}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}

      {/* ── Refractive Glass Lens: Over the text ── */}
      <motion.div
        className="lps-blob-lens"
        animate={{ 
          x: posX,
          width: knobWidth,
          scaleX: isMoving ? 1.4 : 1, // Stretch the lens
          scaleY: isMoving ? 1.4 : 1  // Refractive lens bulges vertically too
        }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        style={{ y: '-50%' }}
      />
    </div>
  );
}

function LiquidModeSwitch({
  mode,
  onChange,
  hasNewContent,
}: {
  mode: 'generator' | 'preview';
  onChange: (m: 'generator' | 'preview') => void;
  hasNewContent?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(280);
  const [pressed, setPressed] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setTrackWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setTrackWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!clicked) return;
    const t = window.setTimeout(() => setClicked(false), 360);
    return () => window.clearTimeout(t);
  }, [clicked]);

  const isMoving = pressed || clicked;
  const knobWidth = Math.max(90, Math.floor((trackWidth - 8) / 2));
  const posX = mode === 'generator' ? 4 : Math.max(4, trackWidth - knobWidth - 4);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const targetMode = touchX > rect.width * 0.5 ? 'preview' : 'generator';
    if (targetMode !== mode) {
      onChange(targetMode);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`lms-root ${isMoving ? 'is-moving' : ''}`}
      role="group"
      aria-label="View Mode"
      onTouchStart={() => setPressed(true)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
    >
      {/* ── Background Goo layer: Stretchy expanding liquid tail ── */}
      <div className="lms-liquids" style={{ filter: 'url(#goo)' }}>
        <div className="lms-ring" />
        <motion.div
          className="lms-blob-goo"
          animate={{
            x: posX,
            width: knobWidth,
            backgroundColor: isMoving ? 'rgba(210, 218, 226, 0.95)' : 'rgba(255, 255, 255, 1)',
            scaleX: isMoving ? 1.55 : 1,
            scaleY: isMoving ? 1.45 : 1,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          style={{ y: '-50%', originX: 0.5, originY: 0.5 }}
        />
      </div>

      {/* ── Clickable label buttons ── */}
      <button
        type="button"
        id="mode-generator-btn"
        className={`lms-btn lms-btn-0 ${mode === 'generator' ? 'active' : ''}`}
        onClick={() => {
          if (mode === 'generator') return;
          onChange('generator');
          setClicked(true);
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        aria-pressed={mode === 'generator'}
      >
        <FileText size={14} />
        <span>Generator</span>
      </button>

      <button
        type="button"
        id="mode-preview-btn"
        className={`lms-btn lms-btn-1 ${mode === 'preview' ? 'active' : ''}`}
        onClick={() => {
          if (mode === 'preview') return;
          onChange('preview');
          setClicked(true);
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        aria-pressed={mode === 'preview'}
      >
        <Sparkles size={14} />
        <span>Notes Preview</span>
        {hasNewContent && <span className="mobile-nav-dot" title="Generated notes ready" />}
      </button>

      {/* ── Refractive Liquid Glass Lens: Over the text ── */}
      <motion.div
        className="lms-blob-lens"
        animate={{
          x: posX,
          width: knobWidth,
          scaleX: isMoving ? 1.35 : 1,
          scaleY: isMoving ? 1.3 : 1,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ y: '-50%' }}
      />
    </div>
  );
}

function SettingsIconButton({ onClick }: { onClick: () => void }) {
  const [clicked, setClicked] = useState(false);
  
  React.useEffect(() => {
    if (!clicked) return;
    const timer = window.setTimeout(() => setClicked(false), 120);
    return () => window.clearTimeout(timer);
  }, [clicked]);

  return (
    <motion.button
      className="settings-icon-button"
      onClick={() => {
        onClick();
        setClicked(true);
      }}
      data-clicked={clicked ? 'true' : 'false'}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <Settings size={20} />
      <div className="liquid-ripple"></div>
    </motion.button>
  );
}

declare global {
  function liquidGL(options: any): any;
}

let cachedGeminiModel: string | null = null;
const getAvailableGeminiModel = async (apiKey: string): Promise<string> => {
  if (cachedGeminiModel) return cachedGeminiModel;
  let targetModel = 'gemini-1.5-flash';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const supported = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini')
      );
      const preferred = supported.find((m: any) => m.name.includes('gemini-1.5-flash-latest'))
                     || supported.find((m: any) => m.name.includes('gemini-1.5-flash'))
                     || supported.find((m: any) => m.name.includes('gemini-2.0-flash'))
                     || supported.find((m: any) => m.name.includes('gemini-1.5-pro'))
                     || supported[0];
      if (preferred) targetModel = preferred.name.replace('models/', '');
    }
  } catch (err) {}
  cachedGeminiModel = targetModel;
  return targetModel;
};

// ─── Individual File Preview Card Component ──────────────────────────────────
const FilePreviewItem = ({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const isPdf = file.type === 'application/pdf';

  return (
    <div className="file-preview-card" title={file.name}>
      <button
        type="button"
        className="file-preview-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        title="Remove this file"
        aria-label="Remove this file"
      >
        <X size={11} />
      </button>

      {thumbUrl ? (
        <img src={thumbUrl} alt={file.name} className="file-preview-thumb" />
      ) : isPdf ? (
        <div className="file-preview-icon pdf">
          <FileText size={26} />
        </div>
      ) : (
        <div className="file-preview-icon generic">
          <FileText size={26} />
        </div>
      )}

      <div className="file-preview-info">
        <span className="file-preview-name">{file.name}</span>
        <span className="file-preview-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    </div>
  );
};

function App() {
  const [glassSettings, setGlassSettings] = useState(() => {
    const saved = localStorage.getItem('glassSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      refraction: 0.08, // Stronger refraction to be visible on white grid
      bevelDepth: 0.25, // Deep bevels for liquid look
      bevelWidth: 0.15,
      frost: 4, // Enough frost to blur, but not enough to turn solid white
    };
  });

  const [content, setContent] = useState(DEFAULT_NOTE);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showOcrSection, setShowOcrSection] = useState(false);
  const [showGlassSection, setShowGlassSection] = useState(false);
  const [error, setError] = useState('');
  const [noteTopic, setNoteTopic] = useState('AI_Study_Notes');
  const [mobileTab, setMobileTab] = useState<'generator' | 'preview'>('generator');

  // ── Smart Dynamic Screen Size & Orientation Detection ──────────────────
  const [isCompactScreen, setIsCompactScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 960 || (window.innerWidth <= 1100 && window.innerHeight > window.innerWidth);
  });

  useEffect(() => {
    const handleScreenResize = () => {
      const compact = window.innerWidth <= 960 || (window.innerWidth <= 1100 && window.innerHeight > window.innerWidth);
      setIsCompactScreen(compact);
    };

    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', handleScreenResize);
    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('orientationchange', handleScreenResize);
    };
  }, []);

  // ── PWA App Installation ────────────────────────────────────────────────
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const checkInstalled = () => {
      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      ) {
        setIsAppInstalled(true);
      }
    };
    checkInstalled();

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPromptEvent(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (installPromptEvent) {
      try {
        await installPromptEvent.prompt();
        const choice = await installPromptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsAppInstalled(true);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      setInstallPromptEvent(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('📱 To Install FatNotes on iPhone/iPad:\n\n1. Tap the Share button (square with arrow) at the bottom.\n2. Scroll down and tap "Add to Home Screen".\n3. Tap "Add" in the top right.\n\nThe Liquid Glass Notes app will appear on your home screen!');
      } else {
        alert('💻 To Install FatNotes:\n\n• In Chrome/Edge: Click the "Install" icon in your address bar (top right) or open menu (⋮) → "Install FatNotes".\n• On Android: Open browser menu (⋮) → "Install app" or "Add to Home screen".');
      }
    }
  };

  // ── Thumb-Swipeable Tabs & Scroll Tracking ──────────────────────────────
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const generatorPanelRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  const switchTab = (tab: 'generator' | 'preview') => {
    setMobileTab(tab);
    if (isCompactScreen && mainScrollRef.current) {
      isProgrammaticScrollRef.current = true;
      const targetEl = tab === 'generator' ? generatorPanelRef.current : previewPanelRef.current;
      if (targetEl) {
        const offsetLeft = targetEl.offsetLeft - mainScrollRef.current.offsetLeft;
        mainScrollRef.current.scrollTo({
          left: Math.max(0, offsetLeft),
          behavior: 'smooth',
        });
      }
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    }
  };

  const handleMainScroll = () => {
    if (!isCompactScreen || !mainScrollRef.current) return;
    if (isProgrammaticScrollRef.current) return;

    const { scrollLeft, clientWidth } = mainScrollRef.current;
    if (clientWidth <= 0) return;

    const activeTab = scrollLeft > clientWidth * 0.4 ? 'preview' : 'generator';
    if (activeTab !== mobileTab) {
      setMobileTab(activeTab);
    }
  };

  // Touch gesture helper for responsive thumb flings
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleMainTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleMainTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal thumb flick
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0 && mobileTab === 'generator') {
        switchTab('preview');
      } else if (deltaX > 0 && mobileTab === 'preview') {
        switchTab('generator');
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // ── AI Verification Audit State ─────────────────────────────────────────
  const [auditMetadata, setAuditMetadata] = useState<AuditMetadata | null>(null);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);

  useEffect(() => {
    // Robustly initialize liquidGL for the main panels
    let isMounted = true;
    let timer: any = null;
    let attempts = 0;

    const initLiquidGL = () => {
      if (!isMounted) return;
      // @ts-ignore
      const fn = (window as any).liquidGL;
      const panels = document.querySelectorAll('.generator-panel, .preview-panel');

      if (typeof fn === 'function' && panels.length > 0) {
        try {
          fn({
            snapshot: "body",
            target: ".generator-panel, .preview-panel",
            resolution: 2.0,
            refraction: glassSettings.refraction,
            bevelDepth: glassSettings.bevelDepth,
            bevelWidth: glassSettings.bevelWidth,
            frost: glassSettings.frost,
            shadow: true,
            specular: true,
            reveal: "none"
          });
        } catch (e) {
          console.warn('liquidGL init error:', e);
        }
      } else if (attempts < 30) {
        attempts++;
        timer = setTimeout(initLiquidGL, 100);
      }
    };

    initLiquidGL();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const updateGlassSetting = (key: string, value: number) => {
    const newSettings = { ...glassSettings, [key]: value };
    setGlassSettings(newSettings);
    localStorage.setItem('glassSettings', JSON.stringify(newSettings));
    
    // @ts-ignore
    if (window.__liquidGLRenderer__ && window.__liquidGLRenderer__.lenses) {
      // @ts-ignore
      window.__liquidGLRenderer__.lenses.forEach((lens: any) => {
        lens.options[key] = value;
      });
    }
  };

  // ── AI Provider state ────────────────────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '');
  const [groqModel, setGroqModel] = useState<string>(() => localStorage.getItem('groq_model') || GROQ_MODELS[0].id);
  const [openRouterApiKey, setOpenRouterApiKey] = useState(() => localStorage.getItem('or_api_key') || import.meta.env.VITE_OPENROUTER_API_KEY || '');
  const [openRouterModel, setOpenRouterModel] = useState<string>(() => localStorage.getItem('or_model') || OPENROUTER_MODELS[0].id);

  // ── Local LM Studio OCR state (Zero Cloud Dependence for Document Reading) ───
  const [localOcrEnabled, setLocalOcrEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('local_ocr_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [localOcrEndpoint, setLocalOcrEndpoint] = useState<string>(() => {
    return localStorage.getItem('local_ocr_endpoint') || 'http://169.254.83.107:1234';
  });
  const [localOcrModel, setLocalOcrModel] = useState<string>(() => {
    return localStorage.getItem('local_ocr_model') || 'lightonocr-2-1b';
  });
  const [testOcrStatus, setTestOcrStatus] = useState<string | null>(null);

  const saveLocalOcrEnabled = (enabled: boolean) => {
    setLocalOcrEnabled(enabled);
    localStorage.setItem('local_ocr_enabled', String(enabled));
  };

  const saveLocalOcrEndpoint = (ep: string) => {
    setLocalOcrEndpoint(ep);
    localStorage.setItem('local_ocr_endpoint', ep);
  };

  const saveLocalOcrModel = (model: string) => {
    setLocalOcrModel(model);
    localStorage.setItem('local_ocr_model', model);
  };

  const testLocalOcrConnection = async () => {
    setTestOcrStatus('Testing connection...');
    try {
      const res = await fetch(`/api/local-ocr?endpoint=${encodeURIComponent(localOcrEndpoint)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: localOcrModel,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (res.ok) {
        setTestOcrStatus(`✅ Connected to LM Studio (${localOcrModel})`);
      } else {
        setTestOcrStatus(`❌ Server returned ${res.status}`);
      }
    } catch (e: any) {
      setTestOcrStatus(`❌ Connection failed: ${e.message}`);
    }
  };

  const noteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved settings
  useEffect(() => {
    const savedGemini = localStorage.getItem('gemini_api_key');
    const savedGroq = localStorage.getItem('groq_api_key');
    const savedOpenRouter = localStorage.getItem('openrouter_api_key');
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider | null;
    const savedModel = localStorage.getItem('groq_model');
    const savedORModel = localStorage.getItem('openrouter_model');
    if (savedGemini) setGeminiApiKey(savedGemini);
    if (savedGroq) setGroqApiKey(savedGroq);
    if (savedOpenRouter) setOpenRouterApiKey(savedOpenRouter);
    if (savedProvider) setAiProvider(savedProvider);
    if (savedModel) setGroqModel(savedModel);
    if (savedORModel) setOpenRouterModel(savedORModel);
  }, []);

  const saveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const saveGroqKey = (key: string) => {
    setGroqApiKey(key);
    localStorage.setItem('groq_api_key', key);
  };

  const saveOpenRouterKey = (key: string) => {
    setOpenRouterApiKey(key);
    localStorage.setItem('openrouter_api_key', key);
  };

  const switchProvider = (provider: AIProvider) => {
    setAiProvider(provider);
    localStorage.setItem('ai_provider', provider);
  };

  const saveGroqModel = (model: string) => {
    setGroqModel(model);
    localStorage.setItem('groq_model', model);
  };

  const saveOpenRouterModel = (model: string) => {
    setOpenRouterModel(model);
    localStorage.setItem('openrouter_model', model);
  };

  const SUPPORTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

  const handleFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    let hasInvalid = false;
    Array.from(newFiles).forEach(f => {
      if (SUPPORTED_TYPES.includes(f.type)) {
        validFiles.push(f);
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setError('Some files were ignored. Supported formats: PDF, PNG, JPG, JPEG, WebP.');
    } else {
      setError('');
    }

    if (validFiles.length > 0) {
      setSourceFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSourceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSourceFiles([]);
  };

  const isImageFile = (file: File) => file.type.startsWith('image/');

  // Extract text from an image using Gemini vision (used as fallback for Groq/OpenRouter)
  const extractTextFromImage = async (file: File): Promise<string> => {
    const key = geminiApiKey;
    if (!key) {
      throw new Error('Image input requires a Gemini API key. Please add one in settings — it will be used to read the image even if you generate notes with Groq/OpenRouter.');
    }
    const base64 = await fileToBase64(file);
    const modelName = await getAvailableGeminiModel(key);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extract ALL the text content from this image exactly as written with 100% fidelity. CRITICAL: Never omit or skip ANY dates, years, numbers, names, headings, subheadings, paragraphs, footnotes, or handwritten margin notes. Transcribe everything verbatim without skipping or summarizing.' },
              { inlineData: { mimeType: file.type, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to read image with Gemini.');
    return data.candidates[0].content.parts[0].text as string;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });

  // ── Gemini File Upload API (for large files >15MB) ─────────────────────
  // Routes through Vite server proxy to bypass CORS restrictions
  const INLINE_SIZE_LIMIT = 15 * 1024 * 1024; // 15 MB — stay safely under the 20 MB inline cap

  const uploadFileToGemini = async (file: File, apiKey: string): Promise<{ fileUri: string; mimeType: string }> => {
    const mimeType = file.type;
    const numBytes = file.size;

    // Step 1: Start a resumable upload session (via proxy)
    setContent('📤 Uploading file to Gemini… (starting upload)');
    const startParams = new URLSearchParams({
      key: apiKey,
      contentLength: String(numBytes),
      contentType: mimeType,
      displayName: file.name,
    });
    const startRes = await fetch(`/api/gemini-upload?${startParams}`, { method: 'POST' });

    if (!startRes.ok) {
      const errData = await startRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.error || `File upload init failed (${startRes.status})`);
    }

    const { uploadUrl } = await startRes.json();
    if (!uploadUrl) throw new Error('No upload URL returned from Gemini File API.');

    // Step 2: Upload the actual file bytes (via proxy)
    setContent(`📤 Uploading file to Gemini… (${(numBytes / 1024 / 1024).toFixed(1)} MB)`);
    const uploadParams = new URLSearchParams({ uploadUrl });
    const uploadRes = await fetch(`/api/gemini-upload-bytes?${uploadParams}`, {
      method: 'POST',
      body: file, // send raw File blob
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.error || `File upload failed (${uploadRes.status})`);
    }

    const uploadData = await uploadRes.json();
    const fileUri = uploadData.file?.uri;
    const fileName = uploadData.file?.name; // e.g. "files/abc123"
    if (!fileUri) throw new Error('File uploaded but no URI returned.');

    // Step 3: Poll until file is ACTIVE (processing can take a few seconds for large PDFs)
    setContent('⏳ Processing uploaded file… This may take a moment for large PDFs.');
    let fileState = uploadData.file?.state || 'PROCESSING';
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 60; // up to ~2 minutes

    while (fileState === 'PROCESSING' && pollAttempts < MAX_POLL_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 2000)); // wait 2s between polls
      pollAttempts++;

      const statusParams = new URLSearchParams({ key: apiKey, name: fileName });
      const statusRes = await fetch(`/api/gemini-file-status?${statusParams}`);
      if (!statusRes.ok) continue; // retry on transient errors
      const statusData = await statusRes.json();
      fileState = statusData.state || 'PROCESSING';

      if (fileState === 'FAILED') {
        throw new Error('Gemini failed to process the uploaded file. Try a smaller file or different format.');
      }
      setContent(`⏳ Processing uploaded file… (${pollAttempts * 2}s elapsed)`);
    }

    if (fileState !== 'ACTIVE') {
      throw new Error('File processing timed out. Try a smaller file.');
    }

    return { fileUri, mimeType };
  };

  // ── Resilient Local LM Studio OCR Dispatcher ────────────────────────────────
  const sendLocalOcrRequest = async (payload: any): Promise<string> => {
    let res: Response | null = null;
    let lastErrorMsg = '';

    // Strategy 1: Direct fetch to LM Studio (fastest if CORS allowed)
    try {
      res = await fetch(`${localOcrEndpoint.replace(/\/+$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (directErr: any) {
      lastErrorMsg = directErr.message || 'Direct connection blocked';
    }

    // Strategy 2: Vite Node.js Proxy (zero timeout, bypasses CORS, infinite wait)
    if (!res || !res.ok) {
      try {
        res = await fetch(`/api/local-ocr?endpoint=${encodeURIComponent(localOcrEndpoint)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (proxyErr: any) {
        lastErrorMsg = proxyErr.message || 'Proxy connection failed';
      }
    }

    if (!res) {
      throw new Error(`Failed to reach LM Studio at ${localOcrEndpoint}. Ensure LM Studio server is running. (${lastErrorMsg})`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || `LM Studio returned HTTP ${res.status}. Is ${localOcrModel} active?`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  };

  // ── Local LM Studio OCR Engine (Processes every page locally) ───────────────
  const ocrImageWithLocalLmStudio = async (file: File): Promise<string> => {
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    const payload = {
      model: localOcrModel || 'lightonocr-2-1b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'OCR' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    };

    return await sendLocalOcrRequest(payload);
  };

  const ocrPdfWithLocalLmStudio = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= totalPages; i++) {
      setContent(`🔍 [Local OCR: ${localOcrModel}] Transcribing Page ${i} of ${totalPages} from ${file.name}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.8 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport } as any).promise;

      const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      const payload = {
        model: localOcrModel || 'lightonocr-2-1b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'OCR' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      };

      const pageText = await sendLocalOcrRequest(payload);
      fullText += `\n\n--- Page ${i} of ${totalPages} ---\n${pageText}`;
    }

    return fullText;
  };

  // Unified Document Extractor
  const extractAllDocumentsText = async (files: File[]): Promise<string> => {
    let combinedText = '';

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const isImg = isImageFile(file);

      if (localOcrEnabled) {
        if (isImg) {
          setContent(`🔍 [Local OCR: ${localOcrModel}] Transcribing Image ${idx + 1} of ${files.length}: ${file.name}...`);
          const text = await ocrImageWithLocalLmStudio(file);
          combinedText += `\n\n===== ATTACHED FILE ${idx + 1}/${files.length}: ${file.name} (Transcribed via Local OCR) =====\n${text}`;
        } else {
          const text = await ocrPdfWithLocalLmStudio(file);
          combinedText += `\n\n===== ATTACHED FILE ${idx + 1}/${files.length}: ${file.name} (PDF Transcribed via Local OCR) =====\n${text}`;
        }
      } else {
        if (isImg) {
          setContent(`Reading Image ${idx + 1} of ${files.length}: ${file.name} with Gemini Vision...`);
          const text = await extractTextFromImage(file);
          combinedText += `\n\n===== ATTACHED FILE ${idx + 1}/${files.length}: ${file.name} =====\n${text}`;
        } else {
          setContent(`Extracting PDF ${idx + 1} of ${files.length}: ${file.name}...`);
          const text = await extractTextFromPdf(file);
          combinedText += `\n\n===== ATTACHED FILE ${idx + 1}/${files.length}: ${file.name} =====\n${text}`;
        }
      }
    }

    return combinedText;
  };

  // ── Gemini generation ────────────────────────────────────────────────────
  const generateWithGemini = async (finalUserContent: string, skipFileUploads: boolean = false) => {
    if (!geminiApiKey) {
      setError('Please provide a Gemini API Key in settings.');
      setShowSettings(true);
      return null;
    }

    const contentsParts: any[] = [];

    // If local OCR is OFF, fall back to uploading the inline files to Gemini (first pass only)
    if (!skipFileUploads && !localOcrEnabled && sourceFiles.length > 0) {
      for (let idx = 0; idx < sourceFiles.length; idx++) {
        let fileToProcess = sourceFiles[idx];
        setContent(`📄 Preparing file ${idx + 1} of ${sourceFiles.length}: ${fileToProcess.name}...`);

        if (fileToProcess.type === 'application/pdf' && fileToProcess.size > INLINE_SIZE_LIMIT) {
          try {
            fileToProcess = await compressPdfSmartly(fileToProcess, (msg) => setContent(msg));
          } catch (compErr) {
            console.warn('Smart PDF compression fallback:', compErr);
          }
        } else if (isImageFile(fileToProcess) && fileToProcess.size > 8 * 1024 * 1024) {
          try {
            fileToProcess = await compressImageSmartly(fileToProcess);
          } catch (imgErr) {
            console.warn('Image compression fallback:', imgErr);
          }
        }

        if (fileToProcess.size > INLINE_SIZE_LIMIT) {
          const { fileUri, mimeType } = await uploadFileToGemini(fileToProcess, geminiApiKey);
          contentsParts.push({ text: `\n--- ATTACHED FILE ${idx + 1} of ${sourceFiles.length}: ${fileToProcess.name} ---` });
          contentsParts.push({ fileData: { fileUri, mimeType } });
        } else {
          const base64 = await fileToBase64(fileToProcess);
          const mimeType = fileToProcess.type;
          contentsParts.push({ text: `\n--- ATTACHED FILE ${idx + 1} of ${sourceFiles.length}: ${fileToProcess.name} ---` });
          contentsParts.push({ inlineData: { mimeType, data: base64 } });
        }
      }
    }

    contentsParts.push({ text: finalUserContent });
    setContent('🧠 Gemini is analyzing transcribed material & generating output…');

    const modelName = await getAvailableGeminiModel(geminiApiKey);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: contentsParts }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API error.');
    return data.candidates[0].content.parts[0].text as string;
  };

  // ── Groq generation ──────────────────────────────────────────────────────
  const generateWithGroq = async (finalUserContent: string) => {
    if (!groqApiKey) {
      setError('Please provide a Groq API Key in settings.');
      setShowSettings(true);
      return null;
    }

    const selectedModel = GROQ_MODELS.find(m => m.id === groqModel) || GROQ_MODELS[0];
    let userContent = finalUserContent;

    const maxDocChars = selectedModel.maxInputChars - 500;
    if (userContent.length > maxDocChars) {
      userContent = userContent.slice(0, maxDocChars) + '\n\n[... Input text truncated to fit Groq context limits.]';
    }

    setContent(`⚡ Groq (${selectedModel.label}) is writing notes/exam paper at high speed…`);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel.id,
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq API error.');
    return data.choices[0].message.content as string;
  };

  // ── OpenRouter generation ────────────────────────────────────────────────
  const generateWithOpenRouter = async (finalUserContent: string) => {
    if (!openRouterApiKey) {
      setError('Please provide an OpenRouter API Key in settings.');
      setShowSettings(true);
      return null;
    }

    const selectedModel = OPENROUTER_MODELS.find(m => m.id === openRouterModel) || OPENROUTER_MODELS[0];
    let userContent = finalUserContent;

    if (userContent.length > selectedModel.maxInputChars) {
      userContent = userContent.slice(0, selectedModel.maxInputChars) + '\n\n[... Input text truncated to fit model context.]';
    }

    setContent(`🧠 OpenRouter (${selectedModel.label}) is analyzing and reasoning…`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Note Generator',
      },
      body: JSON.stringify({
        model: selectedModel.id,
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenRouter API error.');
    return data.choices[0].message.content as string;
  };

  const extractYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const fetchYoutubeTranscript = async (videoId: string) => {
    try {
      const res = await fetch(`/api/yt-transcript?videoId=${videoId}`);
      const data = await res.json();
      if (data.success) {
        return data.text;
      }
      throw new Error(data.error || 'Failed to fetch transcript');
    } catch (err) {
      console.error(err);
      throw new Error('Failed to extract YouTube transcript. The video might not have captions, or you need to run the app using the Vite dev server for the proxy to work.');
    }
  };

  // ── Main generate handler ─────────────────────────────────────────────────
  const generateNotes = async () => {
    if (sourceFiles.length === 0 && !userPrompt) {
      setError('Please upload at least one file or enter prompt instructions.');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      switchTab('preview');
      setContent('Reading attached documents and extracting content...');

      let docText = '';

      // Extract text from attached files (using Local LM Studio when enabled)
      if (sourceFiles.length > 0) {
        docText = await extractAllDocumentsText(sourceFiles);
      }

      // Auto-detect language from prompt and extracted documents (Strict English default)
      const { language: detectedLang, reason: langReason } = detectLanguageFromContent(userPrompt, docText);

      let finalUserContent = SYSTEM_INSTRUCTIONS(userPrompt, detectedLang);
      if (docText) {
        finalUserContent += `\n\n=== SOURCE STUDY MATERIAL & DOCUMENT TRANSCRIPTIONS (100% Verified) ===\n${docText}`;
      }

      const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+)/g;
      const ytLinks = userPrompt.match(ytRegex);

      if (ytLinks && ytLinks.length > 0) {
        setContent('Fetching YouTube transcript... This may take a moment...');
        const videoId = extractYouTubeVideoId(ytLinks[0]);
        if (videoId) {
          const transcript = await fetchYoutubeTranscript(videoId);
          finalUserContent += `\n\n===== YOUTUBE VIDEO TRANSCRIPT =====\n${transcript}`;
          setContent('Processing with AI...');
        }
      } else {
        // Check for other normal links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = userPrompt.match(urlRegex);
        if (urls && urls.length > 0) {
          setContent('Scraping website content... This may take a moment...');
          try {
            const res = await fetch(`/api/scrape?url=${encodeURIComponent(urls[0])}`);
            const data = await res.json();
            if (data.success && data.text) {
              finalUserContent += `\n\n===== WEBSITE CONTENT (${urls[0]}) =====\n${data.text}`;
            }
          } catch (e) {
            console.error('Failed to scrape URL', e);
          }
          setContent('Processing with AI...');
        }
      }

      setContent(`Stage 1/2: Synthesizing notes from syllabus (Auto-detected: ${detectedLang.toUpperCase()})...`);

      let generatedText: string | null = null;

      if (aiProvider === 'gemini') {
        generatedText = await generateWithGemini(finalUserContent);
      } else if (aiProvider === 'groq') {
        generatedText = await generateWithGroq(finalUserContent);
      } else if (aiProvider === 'openrouter') {
        generatedText = await generateWithOpenRouter(finalUserContent);
      }

      if (!generatedText) {
        setIsGenerating(false);
        return;
      }

      // Cleanup markdown wrapping if present
      if (generatedText.startsWith('```markdown')) {
        generatedText = generatedText.replace(/^```markdown\n/i, '').replace(/\n```$/i, '');
      } else if (generatedText.startsWith('```')) {
        generatedText = generatedText.replace(/^```\w*\n/i, '').replace(/\n```$/i, '');
      }

      // ── Stage 2/2: Mandatory Deep AI Verification & Hallucination Elimination Pass ─────
      setContent('🔍 Stage 2/2: Performing strict line-by-line verification against source documents & syllabus (Eliminating hallucinations & checking for missing concepts)...');

      try {
        const auditPrompt = buildSyllabusAuditPrompt({
          draftContent: generatedText,
          sourceMaterial: docText || userPrompt,
          userPrompt,
          detectedLanguage: detectedLang,
        });

        let auditResponseText: string | null = null;
        if (aiProvider === 'gemini') {
          auditResponseText = await generateWithGemini(auditPrompt, true);
        } else if (aiProvider === 'groq') {
          auditResponseText = await generateWithGroq(auditPrompt);
        } else if (aiProvider === 'openrouter') {
          auditResponseText = await generateWithOpenRouter(auditPrompt);
        }

        if (auditResponseText) {
          const auditResult = parseAuditResponse(auditResponseText, generatedText, detectedLang, langReason);
          generatedText = auditResult.finalContent;
          setAuditMetadata(auditResult.metadata);
        }
      } catch (auditErr) {
        console.warn('Syllabus verification pass error:', auditErr);
      }

      // Extract a smart filename from the generated notes
      const headingMatch = generatedText.match(/^#{1,3}\s+(.+)/m);
      if (headingMatch?.[1]) {
        const title = headingMatch[1].replace(/[<>:"/\\|?*]/g, '').trim();
        setNoteTopic(title || 'Study_Notes');
      } else {
        const cleanText = generatedText.replace(/[*_#`]/g, '').trim().split('\n').filter(line => line.trim().length > 0)[0] || '';
        const title = cleanText.substring(0, 40).replace(/[<>:"/\\|?*]/g, '').trim();
        setNoteTopic(title || 'Study_Notes');
      }

      setContent(generatedText);
    } catch (err: any) {
      console.error(err);
      setError('Error generating: ' + err.message);
      setContent(DEFAULT_NOTE);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAsPDF = async () => {
    if (!noteRef.current) return;
    try {
      setIsExporting(true);
      const inner = (noteRef.current.querySelector('.note-card-inner') as HTMLElement) || noteRef.current;
      const cleanTitle = (noteTopic || 'Aesthetic_Notes').replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');

      await exportNotesToAestheticPdf({
        sourceElement: inner,
        filename: `${cleanTitle}.pdf`,
        topicTitle: noteTopic || 'Study Notes',
        onProgress: (msg) => setExportProgress(msg),
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };


  const activeKey = 
    aiProvider === 'gemini' ? geminiApiKey : 
    aiProvider === 'groq' ? groqApiKey : 
    openRouterApiKey;

  return (
    <>
      <div className="app-container">
        <BackgroundGrid />

      {/* ── Custom Gooey & Knockout Filters ─── */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <filter id="goo">
          <feGaussianBlur result="SvgjsFeGaussianBlur1000" in="SourceGraphic" stdDeviation="13" />
          <feColorMatrix result="SvgjsFeColorMatrix1001" in="SvgjsFeGaussianBlur1000" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 13 -10" type="matrix" />
          <feComposite result="SvgjsFeComposite1002" in="SvgjsFeColorMatrix1001" operator="atop" />
        </filter>
        <filter id="knockout" colorInterpolationFilters="sRGB">
          <feColorMatrix result="knocked" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1 -1 -1 1 0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="3" intercept="-1" />
            <feFuncG type="linear" slope="3" intercept="-1" />
            <feFuncB type="linear" slope="3" intercept="-1" />
          </feComponentTransfer>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0 0 0 0 0 1 1 1 1 1" />
            <feFuncG type="table" tableValues="0 0 0 0 0 1 1 1 1 1" />
            <feFuncB type="table" tableValues="0 0 0 0 0 1 1 1 1 1" />
          </feComponentTransfer>
        </filter>
        <filter id="remove-black" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -255 -255 -255 0 1" result="black-pixels" />
          <feMorphology in="black-pixels" operator="dilate" radius="0.5" result="smoothed" />
          <feComposite in="SourceGraphic" in2="smoothed" operator="out" />
        </filter>
      </svg>


      {/* ── Settings Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              className="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              className="settings-panel"
              initial={{ opacity: 0, scale: 0.94, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            >
              <div className="settings-content">
                <div className="settings-header">
                  <h3>Settings & AI Configuration</h3>
                  <button className="settings-close-btn" onClick={() => setShowSettings(false)}>
                    <X size={18} />
                  </button>
                </div>

              {/* Provider Toggle – Liquid Switch */}
              <div className="provider-switcher">
                <span className="provider-label">AI Provider</span>
                <LiquidProviderSwitch provider={aiProvider} onChange={switchProvider} />
              </div>

              {/* API Keys */}
              <AnimatePresence mode="wait">
                {aiProvider === 'gemini' ? (
                  <motion.div
                    key="gemini-key"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="key-section"
                  >
                    <p className="settings-desc">
                      Get your free Gemini key at{' '}
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                        Google AI Studio
                      </a>.
                    </p>
                    <div className="input-group">
                      <input
                        id="gemini-api-key-input"
                        type="password"
                        value={geminiApiKey}
                        onChange={e => saveGeminiKey(e.target.value)}
                        placeholder="Paste your Gemini AI API Key (AIz...)"
                      />
                    </div>
                  </motion.div>
                ) : aiProvider === 'groq' ? (
                  <motion.div
                    key="groq-key"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="key-section"
                  >
                    <p className="settings-desc">
                      Get your Groq key at{' '}
                      <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: '#f97316' }}>
                        console.groq.com
                      </a>. Recommended: Llama 3.3 70B.
                    </p>
                    <div className="input-group">
                      <input
                        id="groq-api-key-input"
                        type="password"
                        value={groqApiKey}
                        onChange={e => saveGroqKey(e.target.value)}
                        placeholder="Paste your Groq API Key (gsk_...)"
                      />
                    </div>
                    <div className="model-selector">
                      <label className="model-label">Groq Model</label>
                      <select
                        id="groq-model-select"
                        className="model-select"
                        value={groqModel}
                        onChange={e => saveGroqModel(e.target.value)}
                      >
                        {GROQ_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="or-key"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="key-section"
                  >
                    <p className="settings-desc">
                      Get your OpenRouter key at{' '}
                      <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: '#0066cc' }}>
                        openrouter.ai
                      </a>.
                    </p>
                    <div className="input-group">
                      <input
                        id="or-api-key-input"
                        type="password"
                        value={openRouterApiKey}
                        onChange={e => saveOpenRouterKey(e.target.value)}
                        placeholder="Paste your OpenRouter API Key (sk-or-...)"
                      />
                    </div>
                    <div className="model-selector">
                      <label className="model-label">Model</label>
                      <select
                        id="or-model-select"
                        className="model-select or-select"
                        value={openRouterModel}
                        onChange={e => saveOpenRouterModel(e.target.value)}
                      >
                        {OPENROUTER_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Compact PWA Install Row ── */}
              <div className="install-pwa-compact-row">
                <div className="install-pwa-compact-info">
                  <img src="/icons/icon-192.png" alt="App Icon" className="install-pwa-compact-icon" />
                  <div>
                    <div className="install-pwa-compact-title">Liquid Glass Notes App</div>
                    <div className="install-pwa-compact-meta">Offline ready & fullscreen</div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`install-pwa-btn-compact ${isAppInstalled ? 'installed' : ''}`}
                  onClick={handleInstallApp}
                >
                  {isAppInstalled ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Installed</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Install App</span>
                    </>
                  )}
                </button>
              </div>

              {/* ── Local LM Studio OCR (Collapsible) ── */}
              <div className="settings-accordion-card">
                <div className="settings-accordion-header">
                  <button
                    type="button"
                    className="settings-accordion-trigger"
                    onClick={() => setShowOcrSection(!showOcrSection)}
                  >
                    <Zap size={15} color="#3b82f6" />
                    <span>Local OCR (LM Studio)</span>
                    {showOcrSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <label className="settings-accordion-toggle">
                    <input
                      type="checkbox"
                      checked={localOcrEnabled}
                      onChange={e => {
                        saveLocalOcrEnabled(e.target.checked);
                        if (e.target.checked) setShowOcrSection(true);
                      }}
                      style={{ accentColor: '#3b82f6', width: '15px', height: '15px' }}
                    />
                    {localOcrEnabled ? <span className="local-ocr-badge">ON</span> : <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>OFF</span>}
                  </label>
                </div>
                <AnimatePresence>
                  {showOcrSection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="settings-accordion-body"
                    >
                      <p className="local-ocr-desc">
                        Extracts text locally with LightOnOCR-2 before AI prompt generation.
                      </p>
                      <div className="local-ocr-inputs">
                        <div className="local-ocr-row">
                          <span className="local-ocr-label">Server:</span>
                          <input
                            className="local-ocr-input"
                            type="text"
                            value={localOcrEndpoint}
                            onChange={e => saveLocalOcrEndpoint(e.target.value)}
                            placeholder="http://169.254.83.107:1234"
                          />
                        </div>
                        <div className="local-ocr-row">
                          <span className="local-ocr-label">Model:</span>
                          <input
                            className="local-ocr-input"
                            type="text"
                            value={localOcrModel}
                            onChange={e => saveLocalOcrModel(e.target.value)}
                            placeholder="lightonocr-2-1b"
                          />
                          <button
                            type="button"
                            className="local-ocr-test-btn"
                            onClick={testLocalOcrConnection}
                          >
                            Test
                          </button>
                        </div>
                        {testOcrStatus && (
                          <div className="local-ocr-test-status">
                            {testOcrStatus}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Glass Shader Tuning (Collapsible) ── */}
              <div className="settings-accordion-card">
                <div className="settings-accordion-header">
                  <button
                    type="button"
                    className="settings-accordion-trigger"
                    onClick={() => setShowGlassSection(!showGlassSection)}
                  >
                    <Sparkles size={15} color="#a855f7" />
                    <span>Glass Shader Appearance</span>
                    {showGlassSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Advanced</span>
                </div>
                <AnimatePresence>
                  {showGlassSection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="settings-accordion-body"
                    >
                      <div className="glass-controls">
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Refraction</span>
                            <span>{glassSettings.refraction.toFixed(3)}</span>
                          </div>
                          <input type="range" min="0" max="0.1" step="0.001" value={glassSettings.refraction} onChange={e => updateGlassSetting('refraction', parseFloat(e.target.value))} />
                        </div>
                        
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Bevel Depth</span>
                            <span>{glassSettings.bevelDepth.toFixed(2)}</span>
                          </div>
                          <input type="range" min="0" max="0.5" step="0.01" value={glassSettings.bevelDepth} onChange={e => updateGlassSetting('bevelDepth', parseFloat(e.target.value))} />
                        </div>
                        
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Bevel Width</span>
                            <span>{glassSettings.bevelWidth.toFixed(2)}</span>
                          </div>
                          <input type="range" min="0" max="0.5" step="0.01" value={glassSettings.bevelWidth} onChange={e => updateGlassSetting('bevelWidth', parseFloat(e.target.value))} />
                        </div>
                        
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Frost (Blur)</span>
                            <span>{glassSettings.frost}px</span>
                          </div>
                          <input type="range" min="0" max="30" step="1" value={glassSettings.frost} onChange={e => updateGlassSetting('frost', parseFloat(e.target.value))} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* ── Mobile Navigation Bar (Expanding Liquid Glass Mode Switcher) ── */}
      <div className="mobile-nav-bar">
        <LiquidModeSwitch
          mode={mobileTab}
          onChange={switchTab}
          hasNewContent={Boolean(content && content !== DEFAULT_NOTE)}
        />
        <div className="mobile-header-actions">
          {!isAppInstalled && (
            <button
              type="button"
              className="mobile-install-btn"
              onClick={handleInstallApp}
              title="Install FatNotes App (Liquid Glass Icon)"
              aria-label="Install App"
            >
              <Download size={16} />
            </button>
          )}
          <button
            type="button"
            className="mobile-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── Main Content (Thumb-Swipeable Carousel Track on Mobile) ─────── */}
      <main
        className="main-content"
        ref={mainScrollRef}
        onScroll={handleMainScroll}
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        <motion.div
          ref={generatorPanelRef}
          className="editor-panel generator-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={16} />
              AI Note & Question Paper Generator

              {/* Active provider badge */}
              <span className={`provider-badge ${aiProvider === 'groq' ? 'groq' : aiProvider === 'openrouter' ? 'or' : ''}`}>
                {aiProvider === 'gemini' ? (
                  <><Sparkles size={10} /> Gemini</>
                ) : aiProvider === 'groq' ? (
                  <><Zap size={10} /> Groq</>
                ) : (
                  <><BookOpen size={10} /> OpenRouter</>
                )}
              </span>
            </div>
            <div className="header-actions-group">
              {!isAppInstalled && (
                <button
                  type="button"
                  className="install-app-header-btn"
                  onClick={handleInstallApp}
                  title="Install FatNotes App (Liquid Glass Icon)"
                  aria-label="Install FatNotes App"
                >
                  <Download size={14} />
                  <span>Install App</span>
                </button>
              )}
              <SettingsIconButton onClick={() => setShowSettings(!showSettings)} />
            </div>
          </div>

          <div className="generator-form">
            {error && (
              <div className="error-banner">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Step 1: Upload Source Material */}
            <div className="form-section">
              <label>1. Provide Source Material (Upload one or multiple PDFs / Images)</label>
              <div
                className={`file-drop-area ${sourceFiles.length > 0 ? 'active' : ''} ${isDragging ? 'drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFiles(e.dataTransfer.files);
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {sourceFiles.length > 0 ? (
                  <div className="multi-file-container" onClick={(e) => e.stopPropagation()}>
                    <div className="multi-file-header">
                      <div className="multi-file-badge">
                        <CheckCircle2 size={14} color="#000000" />
                        <span>{sourceFiles.length} {sourceFiles.length === 1 ? 'File' : 'Files'} Attached ({(sourceFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <div className="multi-file-actions">
                        <button
                          type="button"
                          className="multi-file-add-btn"
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload more images/PDFs"
                        >
                          <Plus size={13} />
                          Add More
                        </button>
                        <button
                          type="button"
                          className="multi-file-clear-btn"
                          onClick={clearAllFiles}
                          title="Remove all uploaded files"
                        >
                          <Trash2 size={13} />
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="multi-file-grid">
                      {sourceFiles.map((file, idx) => (
                        <FilePreviewItem
                          key={`${file.name}-${file.size}-${idx}`}
                          file={file}
                          index={idx}
                          onRemove={removeFile}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <UploadCloud size={32} />
                    <span>Click or Drag & Drop Multiple PDFs or Images</span>
                    <small>Select multiple photos at once — textbook pages, handwritten notes, syllabus, PDFs</small>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Prompt */}
            <div className="form-section fill-height">
              <label>2. What do you need? (Notes, Explanations, or Question Paper)</label>
              <textarea
                className="prompt-textarea"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                placeholder={`Tell me exactly what you need! Examples:
• "Make a 50-mark question paper with 1-marker MCQs, 2-marker, 3-marker, and 5-marker questions"
• "Create a 20-mark weekly test on Chapter 3 with complete marking scheme & answers"
• "CBSE Class 10 Science 80-mark mock exam paper"
• "Comprehensive study notes for Unit 2 in simple language"
• "Detailed stanza-by-stanza poem explanation with literary devices"
• "Difference between TCP and UDP — create a comparison table"
• Or paste a YouTube link to make notes/quiz from video`}
              />
            </div>

            {/* Generate Button */}
            <div className="form-action">
              <button
                id="generate-btn"
                className={`btn-generate ${aiProvider === 'groq' ? 'groq-btn' : aiProvider === 'openrouter' ? 'or-btn' : ''}`}
                onClick={generateNotes}
                disabled={isGenerating || (sourceFiles.length === 0 && !userPrompt) || !activeKey}
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="animate-pulse" size={18} />
                    {aiProvider === 'groq' ? 'Groq is Writing Notes/Exam Paper at Ludicrous Speed...' : 
                     aiProvider === 'openrouter' ? 'OpenRouter is Thinking...' : 
                     'AI is Analyzing Document & Formatting Output...'}
                  </>
                ) : (
                  <>
                    {aiProvider === 'groq' ? <Zap size={18} /> : 
                     aiProvider === 'openrouter' ? <BookOpen size={18} /> : 
                     <Sparkles size={18} />}
                    Generate with {aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'groq' ? 'Groq' : 'OpenRouter'}
                  </>
                )}
              </button>
              {!activeKey && (
                <p className="key-warning">
                  Open settings to add your {aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'groq' ? 'Groq' : 'OpenRouter'} API key.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Preview Panel (Auto-Detects Question Papers vs Notes) ─────────────────── */}
        <motion.div
          ref={previewPanelRef}
          className="preview-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Audit & Syllabus Verification Banner */}
          {auditMetadata && (
            <div className="audit-badge-card">
              <div
                className="audit-badge-header"
                onClick={() => setShowAuditDrawer(!showAuditDrawer)}
                title="Click to toggle syllabus audit details"
              >
                <div className="audit-badge-left">
                  <div className="audit-shield-icon">
                    <ShieldCheck size={18} color="#10b981" />
                  </div>
                  <div>
                    <div className="audit-badge-title">
                      Verified AI Study Material
                      <span className="audit-score-pill">{auditMetadata.coverageScore}% Coverage</span>
                      <span className="audit-lang-pill">
                        {auditMetadata.detectedLanguage === 'english'
                          ? '100% English'
                          : auditMetadata.detectedLanguage === 'hindi'
                          ? 'Hindi'
                          : 'Hinglish'}
                      </span>
                    </div>
                    <div className="audit-badge-sub">
                      Zero Hallucinations Verified • {auditMetadata.languageReason}
                    </div>
                  </div>
                </div>
                <div className="audit-badge-right">
                  {auditMetadata.missingTopicsAdded.length > 0 && (
                    <span className="audit-status-tag added">
                      +{auditMetadata.missingTopicsAdded.length} topics enriched
                    </span>
                  )}
                  {auditMetadata.correctedItems.length > 0 && (
                    <span className="audit-status-tag corrected">
                      {auditMetadata.correctedItems.length} fixes applied
                    </span>
                  )}
                  <button type="button" className="audit-toggle-btn" aria-label="Toggle details">
                    {showAuditDrawer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {showAuditDrawer && (
                <div className="audit-badge-body">
                  <p className="audit-summary-text">{auditMetadata.auditNotes}</p>
                  {auditMetadata.missingTopicsAdded.length > 0 && (
                    <div className="audit-section-block">
                      <span className="audit-section-heading">📚 Added & Enriched Missing Syllabus Topics:</span>
                      <div className="audit-tags-container">
                        {auditMetadata.missingTopicsAdded.map((item, idx) => (
                          <span key={idx} className="audit-item-tag green">✓ {item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {auditMetadata.correctedItems.length > 0 && (
                    <div className="audit-section-block">
                      <span className="audit-section-heading">🛠️ Verified & Fixed Inaccuracies / Language:</span>
                      <div className="audit-tags-container">
                        {auditMetadata.correctedItems.map((item, idx) => (
                          <span key={idx} className="audit-item-tag blue">✓ {item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {auditMetadata.verifiedTopics.length > 0 && (
                    <div className="audit-section-block">
                      <span className="audit-section-heading">🎯 Core Topics Verified:</span>
                      <div className="audit-tags-container">
                        {auditMetadata.verifiedTopics.map((item, idx) => (
                          <span key={idx} className="audit-item-tag gray">✓ {item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isQuestionPaperContent(content) ? (
            <QuestionPaperRenderer
              rawContent={content}
              paperTitle={noteTopic}
              isGenerating={isGenerating}
              onBackToEditor={isCompactScreen ? () => switchTab('generator') : undefined}
            />
          ) : (
            <>
              <div className="panel-header preview-header">
                <div className="panel-title">
                  {isCompactScreen && (
                    <button
                      type="button"
                      className="mobile-back-to-gen-btn"
                      onClick={() => switchTab('generator')}
                      title="Back to Generator"
                    >
                      <ChevronLeft size={16} />
                      <span>Edit</span>
                    </button>
                  )}
                  <Sparkles size={16} />
                  <span>Aesthetic Note Output</span>
                </div>
                <button
                  id="export-pdf-btn"
                  className="btn-primary"
                  onClick={exportAsPDF}
                  disabled={isExporting || isGenerating}
                >
                  {isExporting ? <Sparkles size={14} className="animate-pulse" /> : <Download size={14} />}
                  {exportProgress || (isExporting ? 'Exporting...' : 'Export PDF')}
                </button>
              </div>
              <div className="preview-container">
                <motion.div
                  className="note-card-wrapper"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="note-card" ref={noteRef}>
                    <div className="note-card-inner">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
    </>
  );
}

export default App;
