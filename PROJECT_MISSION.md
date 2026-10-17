# Project Mission

## Project Name
FatNotes — Intelligent Note & Question Paper Generator (2-Stage AI Engine)

## Main Objective
A high-performance, aesthetically stunning web application designed for students and educators. It transforms textbook photos, multi-page PDFs, handwritten notes, YouTube lectures, and article links into exam-ready study notes, stanza-by-stanza poem explanations, comprehensive revision summaries, or authentic board-style examination question papers with marking schemes.

## Core Architectural Vision: 2-Stage Pipeline
1. **Stage 1 (Local Zero-Cloud OCR — LM Studio / LightOnOCR-2)**:
   - High-fidelity optical character recognition running 100% locally on the user's machine.
   - Slices multi-page PDFs and multi-image batches page-by-page so no text, date, or page is ever skipped.
2. **Stage 2 (High-Intelligence Reasoning — Gemini / Groq / OpenRouter)**:
   - Receives 100% verified raw transcriptions from Stage 1.
   - Performs deep academic synthesis, concept breakdowns, question generation, and markdown formatting without vision hallucinations or page drops.

## Success Criteria
- [x] **Multi-File / Multi-Image Upload**: Select multiple textbook photos and PDFs at once with live gallery preview.
- [x] **Local LM Studio OCR Integration**: Direct connection to local server (`http://169.254.83.107:1234`) running `lightonocr-2-1b`.
- [x] **Zero Page-Skipping**: Sequential canvas slicing for PDFs ensuring 100% page and date preservation.
- [x] **3-Way Reasoning Provider Support**: Gemini, Groq (Llama 3.3 70B), and OpenRouter (DeepSeek, Claude, Gemini Pro).
- [x] **Authentic Exam & Question Paper Engine**: "Scary White Page" board layout, section mark distribution, internal OR choices, and marking schemes.
- [x] **Mandatory Date & Timeline Preservation**: Strict prompt constraints guaranteeing all historical years, biographical dates, and numbers are retained.
- [x] **Liquid Glass (liquidGL) UI**: WebGL-powered frosted glass refraction, dynamic animations, and dark mode PDF exports.
- [x] **Large File Handling**: Client-side smart PDF compression and Gemini File API proxy for files >15MB.
- [ ] **YouTube Video Transcript Auto-Fetcher**: Verification and expansion for multi-language captions.

## Non-goals
- Not a generic unguided chat bot.
- Not a full-fledged manual document editor or cloud file storage system.

## Design Philosophy
Apple-inspired liquid glass aesthetic. Dark mode notes, frosted WebGL glass panels, authentic board-exam paper styles, and beginner-friendly, accessible language across Hindi, Hinglish, and English.
