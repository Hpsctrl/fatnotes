# Known Issues

## Multi-Page PDF Page-Skipping on Direct Vision LLMs
* **Description**: When multi-page scanned PDFs or large base64 documents were sent directly to cloud vision LLMs (like Gemini 1.5), the model occasionally skipped entire pages (e.g. Page 32 of Tagore's *The Sunset of the Century*).
* **Severity**: High
* **Status**: Resolved (2026-08-20)
* **Cause**: Cloud multi-modal LLMs apply lossy attention downsampling over long multi-image base64 contexts.
* **Solution**: Introduced Stage 1 Local OCR with `pdfjs-dist` sequential canvas slicing at 1.8x scale and `LightOnOCR-2-1b` extraction. The verified text is then passed to Stage 2 reasoning models.

## LM Studio Localhost CORS Restrictions
* **Description**: Web browser security (CORS) blocks direct `fetch()` calls from `localhost:5173` to `http://169.254.83.107:1234`.
* **Severity**: Medium
* **Status**: Resolved (2026-08-20)
* **Cause**: LM Studio's default local webserver does not always inject wildcard CORS headers for custom origin ports.
* **Solution**: Implemented `localOcrProxy` plugin in `vite.config.ts` to route `/api/local-ocr` requests seamlessly through Vite's Node.js backend.

## liquidGL Panel Transparency vs Button Visibility
* **Description**: liquidGL requires target panels to have `background: transparent` so the WebGL canvas behind them is visible. If buttons/inputs inside the panels also get forced transparent, they become invisible.
* **Severity**: High
* **Status**: Resolved (2026-08-15)
* **Solution**: Keep panel-only transparency override separate from button/input styles.

## liquidGL Reveal Mode "fade" Locks Opacity at 0
* **Description**: When `reveal: "fade"` is used, liquidGL sets `el.style.opacity = 0` on target panels and animates them in. If snapshot capture fails, panels stay invisible.
* **Severity**: Medium
* **Status**: Resolved (2026-08-15) — set to `reveal: "none"`.
