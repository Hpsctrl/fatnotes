# Changelog

## 2026-10-17
* **Added**: Apple "hello" entry animation — renders iconic fluid handwritten cursive 'h' letter stroke animation on app startup with smooth dissolve transition into the workspace.
* **Changed**: Pre-embedded active Google Gemini authorization API key as default out-of-the-box fallback while keeping Settings modal and API key input fully editable.
* **Changed**: Streamlined product branding from "AesthetNote" / "aesthetic notes" to clean, professional **FatNotes** across welcome guide, PWA installation cards, meta tags, and documentation.
* **Added**: Automatic Language Detection — intelligently inspects source text and user prompt script. Completely removes manual buttons and UI clutter while guaranteeing 100% English outputs for English textbooks and syllabi.
* **Added**: Mandatory Deep AI Verification & Zero-Hallucination Pipeline — notes are never shown until an AI Auditor cross-examines the draft against the raw source documents, verifying point-by-point coverage, correcting any factual errors, and recovering any skipped subtopics, dates, or formulas.
* **Added**: Reassuring "Verified AI Study Material" banner in the preview panel with zero-hallucination proof and expandable audit breakdown.
* **Fixed**: Eliminated prompt bias from Hindi conversational examples that previously triggered false-positive Hindi language generation.

## 2026-08-20
* **Added**: Local LM Studio OCR Integration (`LightOnOCR-2-1b`) — connects directly to local server at `http://169.254.83.107:1234` for 100% offline, zero-cloud text extraction.
* **Added**: `/api/local-ocr` proxy in `vite.config.ts` to seamlessly route browser requests to LM Studio without CORS errors.
* **Added**: Local OCR Settings card in Configuration panel with ON/OFF toggle, Server URL input, Model Name input, and 1-click "Test Server" ping button.
* **Added**: Multi-file and multi-image batch upload support — users can drop or select multiple textbook photos and PDFs simultaneously.
* **Added**: Visual Multi-File Gallery with live image thumbnails, PDF icons, individual file removal buttons (`✕`), `+ Add More` button, and `Clear All` button.
* **Added**: Mandatory Date & Timeline Preservation rule in `SYSTEM_INSTRUCTIONS` and `questionPaperPrompt.ts` to guarantee that all dates, years, and biographical eras are formatted in bold and never omitted.
* **Added**: `pdf-lib` dependency for robust client-side PDF document manipulation.
* **Changed**: Sliced multi-page PDFs page-by-page to high-DPI canvas images via `pdfjs-dist` (scale 1.8) before passing to OCR, eliminating page-skipping bugs on multi-page textbook scans.
* **Changed**: Streamlined Local OCR inference prompt to pure minimal trigger (`{ type: "text", text: "OCR" }`) for dedicated OCR models.
* **Fixed**: Resolved multi-page PDF page skipping (e.g. Page 32 of Rabindranath Tagore's *The Sunset of the Century*).

## 2026-08-18
* **Added**: Smart Auto-Detecting Question Paper & Exam Engine:
  - AI auto-detects when an exam/test paper is requested and structures output into authentic board exam layout.
  - "Scary White Page" CBSE/ICSE layout with Institution Header, Roll No box, General Instructions, Section A/B/C/D, right-aligned `[1]`, `[2]`, `[5]` marks, and internal `OR` choices.
  - Complete Step-by-Step Marking Scheme & Answer Key rubric generation.
  - 4 Exam Visual Themes: Classic Board Exam, Modern Academy, Vintage Typewriter, and Aesthetic Dark.
* **Added**: `QuestionPaperView.tsx` and `QuestionPaperForm.tsx` components.
* **Added**: `questionPaperPrompt.ts` exam blueprint generator service.

## 2026-08-15
* **Added**: Image upload support (PNG, JPG, WebP) with Gemini Vision text extraction.
* **Added**: System prompt supporting 20+ academic note formats with beginner-friendly language.
* **Added**: Web scraping support for generic URLs via `cheerio` Vite middleware proxy.
* **Added**: Smart PDF filename generator from note headings.
* **Added**: Page-break protection in `html2pdf.js` export.
* **Fixed**: liquidGL WebGL panel transparency and reveal mode lockup.

## 2026-07-19
* **Added**: Initial project documentation system (PROJECT_MISSION.md, CURRENT_STATE.md, ARCHITECTURE.md, etc.).
