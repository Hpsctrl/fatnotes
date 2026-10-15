# Architecture

## Major Components
- **`src/App.tsx`**: Central application component housing state management, multi-file handling, Local LM Studio OCR pipeline, AI provider API clients (Gemini, Groq, OpenRouter), Settings modal, and PDF export logic.
- **`src/components/QuestionPaperView.tsx`**: Specialized exam paper renderer offering 4 visual themes ("Scary White Page" CBSE/ICSE board exam, Modern Academy, Vintage Typewriter, Aesthetic Dark), multi-tab toggle (Paper / Marking Scheme / Combined), and print formatting.
- **`src/components/QuestionPaperForm.tsx`**: Question paper customization drawer allowing dynamic section configuration, difficulty presets, and blueprint adjustments.
- **`src/services/questionPaperPrompt.ts`**: Blueprint prompt generator enforcing CBSE/ICSE exam standards and step-by-step marking rubrics.
- **`vite.config.ts`**: Configured with 4 custom server middleware plugins:
  - `localOcrProxy`: Routes `/api/local-ocr` to `http://169.254.83.107:1234/v1/chat/completions` (LM Studio) bypassing browser CORS.
  - `geminiUploadProxy`: Handles resumable uploads to Gemini File API for files >15MB.
  - `scrapeProxy`: Fetches article content with `cheerio`.
  - `ytTranscriptProxy`: Fetches captions from YouTube videos.
- **`public/scripts/liquidGL.js`**: WebGL shader library that renders real-time glass refraction and frost effects behind UI panels.

---

## Data Flow: The 2-Stage Engine

```
[ Multi-File Upload (Images/PDFs) ] ───► [ Drop Area / State (sourceFiles[]) ]
                                                      │
                                                      ▼
                      [ Stage 1: Local OCR Engine (LM Studio / LightOnOCR-2) ]
                      ├── PDF: Sliced page-by-page to Canvas (scale 1.8)
                      ├── Image: Base64 direct transmission
                      └── Proxy: /api/local-ocr -> http://169.254.83.107:1234
                                                      │
                                                      ▼
                            [ 100% Verified Raw Text & Dates Transcribed ]
                                                      │
                                                      ▼
                      [ Stage 2: Reasoning Engine (Gemini / Groq / OpenRouter) ]
                      ├── Injected into SYSTEM_INSTRUCTIONS
                      ├── Enforces Beginner-Friendly Simple Language
                      ├── Enforces Zero Date/Timeline Omission
                      └── Synthesizes Notes OR Exam Question Paper
                                                      │
                                                      ▼
                       [ Markdown View / QuestionPaperView / PDF Export ]
```

---

## Technologies Used
- **Frontend Core**: React 19 + TypeScript + Vite 8
- **PDF & Document Processing**: `pdfjs-dist` (canvas rendering & text extraction), `pdf-lib` (binary PDF manipulation), `html2pdf.js` (DOM to PDF export)
- **Local OCR Server**: LM Studio (`LightOnOCR-2-1b` or `Idefics2`)
- **Cloud Reasoning Providers**: Google Gemini API, Groq Cloud API, OpenRouter API
- **Styling & Effects**: Vanilla CSS, `liquidGL` (WebGL glass shader), `framer-motion` (micro-animations), `lucide-react` (icons)
- **Scraping**: `cheerio` via Vite middleware

---

## Key Design Decisions
1. **Separation of OCR and Reasoning**: Dedicated local vision model handles transcription page-by-page; high-intelligence cloud LLMs handle reasoning and formatting. This completely solves page-skipping hallucinations on multi-page textbook scans.
2. **Vite Middleware Proxies**: All external requests to local ports (`http://169.254.83.107:1234`) or non-CORS endpoints run through Vite development server plugins.
3. **Sequential Canvas PDF Slicing**: Rather than sending a raw PDF blob that a vision model might randomly sample, `pdfjs-dist` renders every single page to a dedicated canvas, guaranteeing 100% page coverage.
