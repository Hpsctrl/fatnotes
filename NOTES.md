# Notes

## Local LM Studio OCR Insights
- **Model**: `lightonocr-2-1b` (running at `http://169.254.83.107:1234`).
- **Prompt Strategy**: Dedicated OCR models respond best to minimal triggers (`{ type: "text", text: "OCR" }`). They should not be given complex chat prompts.
- **Canvas Slicing Scale**: Rendering PDF pages with `pdfjs-dist` at `scale: 1.8` provides crisp ~150–200 DPI resolution, which captures small textbook footnotes, biographical dates, and punctuation without creating huge image buffers.
- **2-Stage Workflow**: Separating OCR (Stage 1) from Reasoning (Stage 2) yields higher quality notes than single-step multi-modal LLM generation because it completely eliminates context-skipping and hallucination on multi-page scans.
