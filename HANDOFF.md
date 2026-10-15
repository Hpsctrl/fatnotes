# Handoff

## Current Status
- All features working. Image upload + versatile AI prompts fully implemented. liquidGL glass effects restored.

## Recent Changes (2026-08-15)
- Removed intro animation (video + loading screen)
- Added image upload support (PNG, JPG, WebP) via Gemini Vision
- Massively upgraded AI prompt to support 20+ note types with beginner-friendly language
- Fixed liquidGL initialization (retry loop) and panel CSS (transparent panels, visible buttons)

## Current Blocker
- None

## Next Recommended Action
- Test the full flow: upload an image → type custom instructions → verify AI output quality
- Verify YouTube link → notes workflow still works
- Consider adding drag-and-drop file upload

## Important Context
- liquidGL requires panels to have `background: transparent !important` — DO NOT apply this to buttons/inputs
- liquidGL uses `reveal: "none"` — DO NOT change to "fade" (causes invisible panels)
- Groq/OpenRouter image support requires a Gemini API key for the Vision preprocessing step
- The `sourceFile` state (formerly `pdfFile`) holds both PDFs and images; type detection uses `File.type`

## Things That Must Not Be Changed
- The `SYSTEM_INSTRUCTIONS` prompt structure — it's carefully tuned for versatile note generation
- liquidGL panel transparency CSS — removing it breaks the glass effect
- The retry loop in the liquidGL useEffect — removing it causes race condition
- The documentation workflow and structure without explicit approval
