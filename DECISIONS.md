# Decisions

## Automatic Language Detection with Strict English Default (Zero UI Clutter)
* **Decision**: Auto-detect language directly from source text and prompt script with zero UI buttons or toggles.
* **Reasoning**: Manual buttons clutter the clean Apple-like aesthetic and burden the user. By analyzing script composition (Devanagari vs Latin characters) and prompt keywords, the engine automatically guarantees 100% English outputs whenever the syllabus/prompt is in English, while smoothly accommodating Hindi textbooks or explicit Hindi requests without extra user effort.
* **Alternatives Considered**: Manual language selector pills (rejected due to UI clutter and unnecessary manual friction).
* **Date**: 2026-10-11

## Mandatory Deep AI Verification & Zero-Hallucination Engine
* **Decision**: Make the 2-Stage Verification & Hallucination Elimination pipeline mandatory and automated on every generation.
* **Reasoning**: Students and teachers need complete confidence that notes are 100% complete and accurate before using them for exams. The AI Auditor cross-checks the draft point-by-point against the raw source text and syllabus, recovering missing concepts, dates, or formulas, and preventing hallucinations from ever reaching the student.
* **Alternatives Considered**: Optional manual toggle (rejected because verification should be an absolute guarantee).
* **Date**: 2026-10-11

## 2-Stage Pipeline: Local OCR (Stage 1) + Cloud LLM Reasoning (Stage 2)
* **Decision**: Decouple document reading/transcription from academic synthesis and reasoning.
* **Reasoning**: Passing raw multi-page image/PDF base64 directly to cloud vision LLMs frequently caused page-skipping hallucinations (e.g., dropping Page 32 of a 2-page poem). Running Stage 1 locally via `LightOnOCR-2-1b` on sequential canvas-rendered pages guarantees 100% text and page retention, while Stage 2 leverages high-intelligence reasoning models for structured formatting.
* **Alternatives Considered**: Direct multi-page base64 to Gemini Pro Vision, Tesseract.js in browser.
* **Trade-offs**: Requires LM Studio to be running locally on the user's network when Local OCR is active (fallback to cloud vision exists).
* **Date**: 2026-08-20

## Pure Minimal OCR Trigger for Dedicated Vision-OCR Models
* **Decision**: Use a minimal `{ type: "text", text: "OCR" }` payload for Stage 1 Local OCR rather than long conversational instructions.
* **Reasoning**: Dedicated models like `LightOnOCR-2-1b` are fine-tuned strictly for pixel-to-text transcription. Long conversational prompts add unnecessary token overhead and can confuse the OCR engine.
* **Alternatives Considered**: Detailed system prompts instructing the model to format markdown.
* **Trade-offs**: All academic formatting and date preservation rules are placed strictly in Stage 2.
* **Date**: 2026-08-20

## Multi-File & Multi-Photo Batch Gallery
* **Decision**: Transition from single-file `sourceFile` to multi-file array `sourceFiles: File[]` with a rich visual gallery.
* **Reasoning**: Students frequently capture 5–10 photos of consecutive textbook pages and previously had to use external tools to merge them into a PDF before uploading.
* **Alternatives Considered**: Single file upload only.
* **Trade-offs**: Slightly more complex upload dropzone and batch extraction loop.
* **Date**: 2026-08-20

## Smart Auto-Detecting Question Paper Engine
* **Decision**: Automatically detect exam requests from the single prompt box and render authentic board exam layouts ("Scary White Page", Institution Header, General Instructions, Section A/B/C/D, right-aligned marks `[1]`, `[2]`, `[5]`, and Marking Schemes).
* **Reasoning**: Keeps the UI clean and unified while providing a specialized, authentic exam rendering experience.
* **Alternatives Considered**: Separate app or rigid dropdown modes.
* **Trade-offs**: Requires specialized regex parsing to separate the question paper from the marking scheme.
* **Date**: 2026-08-18

## Single Smart Prompt vs Multiple Dedicated Prompts
* **Decision**: Use a single versatile `SYSTEM_INSTRUCTIONS` prompt that adapts dynamically to user input.
* **Reasoning**: Maximum flexibility for natural language queries across Hindi, Hinglish, and English.
* **Date**: 2026-08-15
