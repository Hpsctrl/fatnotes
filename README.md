# FatNotes — Intelligent Note & Question Paper Generator

**Upload multiple textbook photos/PDFs or paste article/YouTube links and generate study notes or authentic exam papers in seconds!**

FatNotes is a high-performance web application designed for students and educators. Built with an Apple-style **liquid glass** UI, it features a **2-Stage Processing Engine** that combines local zero-cloud OCR (`LightOnOCR-2-1b`) with high-intelligence reasoning models (Gemini, Groq Llama 3.3 70B, and OpenRouter).

---

## Key Features

### 1. 2-Stage Processing Architecture
- **Stage 1 (Local Zero-Cloud OCR — LM Studio)**: Slices multi-page PDFs page-by-page and transcribes textbook photos locally via `LightOnOCR-2-1b` running at `http://169.254.83.107:1234`. Guarantees **zero skipped pages** and total privacy.
- **Stage 2 (Reasoning LLMs)**: Passes complete verified transcription text to Gemini, Groq, or OpenRouter for academic breakdown, stanza-by-stanza poem explanation, or exam synthesis.

### 2. Multi-File & Image Batching
- Drag and drop or select **multiple textbook photos and multi-page PDFs** simultaneously.
- Visual gallery with live image thumbnails, individual file removal (`✕`), `+ Add More`, and `Clear All` controls.

### 3. 20+ Note Formats & Beginner-Friendly Explanations
- **Golden Rule**: Explains complex concepts in simple, everyday language (Hindi, Hinglish, English).
- Supports exhaustive point-wise notes, definitions, comparison tables, step-by-step derivations, formulas, poem analyses, mind maps, and Q&As.

### 4. Strict Date & Timeline Preservation
- Enforces an absolute zero-drop rule on all dates, years, timelines, and biographical milestones (formatted automatically in **bold**).

### 5. Smart Question Paper & Exam Engine
- Auto-detects exam/test paper requests (e.g., *"Make a 50-mark question paper with marking scheme"*).
- Renders authentic CBSE/ICSE board exam layouts ("Scary White Page", Institution Header, General Instructions, Sections A/B/C/D, right-aligned marks `[1]`, `[2]`, `[5]`, and internal choices).
- Generates step-by-step **Marking Schemes & Model Answers**.
- Offers 4 Exam Themes: Classic Board Exam, Modern Academy, Vintage Typewriter, and Aesthetic Dark.

### 6. Liquid Glass Visual Identity
- Real-time WebGL glass refraction powered by `liquidGL.js` with customizable refraction, bevel depth, and frost blur.
- High-fidelity PDF export with page-break protection.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Local OCR**: LM Studio (`LightOnOCR-2-1b` or `Idefics2`)
- **Cloud Reasoning**: Google Gemini API, Groq Cloud API, OpenRouter API
- **Document & PDF Processing**: `pdfjs-dist`, `pdf-lib`, `html2pdf.js`
- **Styling & Animation**: Vanilla CSS, Framer Motion, Lucide Icons, WebGL `liquidGL.js`
- **Web Scraping**: `cheerio` (via Vite server middleware)

---

## Quick Start

### 1. Installation
```bash
git clone <your-repo-url>
cd "notes maker"
npm install
```

### 2. Run the App
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Local OCR Setup (Optional but Recommended)
1. Open **LM Studio** on your computer or local network.
2. Load the model **`lightonocr-2-1b`** (or `Idefics2`).
3. Start the Local Inference Server (default port: `1234`).
4. In FatNotes, open **Settings** and click **Test Server** under the Local OCR card.

---

## Usage Instructions

1. **Configure Provider**: Open Settings to select your reasoning model (Gemini, Groq, or OpenRouter) and enter your API key.
2. **Upload Documents**: Drag and drop one or multiple textbook photos (JPG, PNG, WebP) or PDFs into the upload area.
3. **Enter Instructions**: Type what you want (e.g. *"Iske parawise explanation chaiye with subheading"* or *"Create a 25-mark class test on Chapter 3"*).
4. **Generate**: Click **Generate Notes** / **Create Question Paper**.
5. **Export**: Click **Export PDF** for print-ready notes or exams.
