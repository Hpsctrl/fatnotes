# Current State

## Current Architecture
- **2-Stage Processing Engine**:
  - **Stage 1 (Local OCR)**: LM Studio running `lightonocr-2-1b` at `http://169.254.83.107:1234` accessed via Vite middleware proxy `/api/local-ocr`. Slices multi-page PDFs page-by-page via `pdfjs-dist` to high-DPI canvas images and transcribes each page with 100% fidelity.
  - **Stage 2 (Reasoning LLMs)**: Passes complete verified transcription text to user's selected provider (Gemini, Groq Llama 3.3 70B, or OpenRouter) for study note generation, stanza-wise poem analysis, or question paper synthesis.
- **Multi-File & Image Batching**: Supports uploading multiple images (JPG, PNG, WebP) and multi-page PDFs simultaneously with live image thumbnail previews, individual removal, "+ Add More", and "Clear All" controls.
- **Frontend Stack**: React 19 + TypeScript + Vite 8 + liquidGL WebGL shader + Framer Motion.
- **Vite Backend Middleware Proxies**:
  - `/api/local-ocr`: Proxies requests to local LM Studio server to avoid browser CORS issues.
  - `/api/gemini-upload` & `/api/gemini-upload-bytes`: Handles resumable large file uploads (>15MB) directly to Gemini File API.
  - `/api/scrape`: Article scraper using `cheerio`.
  - `/api/yt-transcript`: YouTube transcript extractor.

## Working Features
- [x] **Automatic Language Detection (Zero UI Clutter)**:
  - Intelligently analyzes source text and prompt script directly — zero manual buttons needed.
  - Ironclad English Guarantee: When the textbook, syllabus, or prompt is in English, output is strictly 100% in English with zero Hindi/Devanagari leaks.
  - Language-aware: Seamlessly switches to Hindi only when source material or prompt is specifically in Hindi (e.g. Hindi literature).
- [x] **Mandatory Deep AI Verification & Zero-Hallucination Pipeline**:
  - Automatically cross-checks generated notes point-by-point against raw source text and academic curriculum benchmarks before displaying.
  - Completely eliminates AI hallucinations, recovers omitted formulas, dates, and subtopics, and enriches notes.
  - Interactive "🛡️ Verified AI Study Material" banner in the preview panel with expandable breakdown of verified concepts, added syllabus topics, and applied fixes.
- [x] **Local LM Studio OCR Integration**: Slices and transcribes any PDF or image locally with `lightonocr-2-1b` with zero cloud leakage and zero skipped pages.
- [x] **Local OCR Settings Card**: UI toggle to enable/disable local OCR, customize server URL and model name, and 1-click "Test Server" connection ping.
- [x] **Multi-File Drag & Drop Gallery**: Drop or select dozens of textbook photos/PDFs with visual thumbnails, total size badge, and easy deletion.
- [x] **Strict Date & Timeline Preservation**: System prompt and OCR pipeline strictly enforce that every date, year, and chronological marker is retained in bold.
- [x] **Smart Auto-Detecting Question Paper & Exam Engine**:
  - Auto-switches into CBSE/ICSE board exam layout ("Scary White Page") upon prompt request.
  - Institution headers, Roll No box, General Instructions, Section A/B/C/D with right-aligned marks `[1]`, `[2]`, `[5]`, and internal `OR` choices.
  - Step-by-step Marking Scheme & Model Answer Key.
  - Multi-tab preview (Question Paper, Marking Scheme, Combined) and 4 themes.
- [x] **3-Way AI Provider Selection**: Instant liquid switch between Gemini, Groq, and OpenRouter.
- [x] **Smart Client-side PDF & Image Compression**: Downscales oversized files before transmission.
- [x] **High-Fidelity PDF Export**: Page-break protection (`avoid-all`, `css`, `legacy`) preventing cut-off text.
- [x] **Liquid Glass UI**: WebGL-powered real-time refraction and frosted glass sliders.

- [x] **Apple "hello" Entry Animation**:
  - Authentic cursive 'h' letter stroke handwriting animation on app startup.
  - Smooth dissolve transition into workspace and tap-to-skip.
- [x] **Pre-embedded Active Gemini Authorization Key**:
  - Pre-fills active Google Gemini authorization key out of the box so the app works immediately with zero manual configuration.
  - Full customization preserved in Settings modal for changing keys and switching models.

## In-progress Features
- YouTube video transcript extraction edge cases for auto-generated captions.

## Broken Features
- None.

## Current Blockers
- None.

## Current Branch/Build/Version
- Vite dev server active on `localhost:5173`.
- Last successful production build: `2026-10-17` (Built with 0 TypeScript/Vite errors).

## Last Updated Date
2026-10-17
