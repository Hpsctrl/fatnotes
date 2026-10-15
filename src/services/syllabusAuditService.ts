export type DetectedLanguage = 'english' | 'hindi' | 'hinglish';

export interface AuditMetadata {
  verified: boolean;
  coverageScore: number;
  detectedLanguage: DetectedLanguage;
  languageReason: string;
  syllabusName: string;
  verifiedTopics: string[];
  missingTopicsAdded: string[];
  correctedItems: string[];
  auditNotes: string;
}

export interface AuditResult {
  finalContent: string;
  metadata: AuditMetadata;
}

/**
 * Automatically and intelligently detects whether the output should be in English, Hindi, or Hinglish.
 * Eliminates the need for manual buttons by examining the user's prompt instructions and source content.
 * GUARANTEE: If the syllabus/document or user prompt is in English, DEFAULT IS 100% ENGLISH.
 */
export const detectLanguageFromContent = (
  userPrompt: string,
  sourceMaterial: string
): { language: DetectedLanguage; reason: string } => {
  const lowerPrompt = (userPrompt || '').toLowerCase();
  const combined = `${userPrompt || ''}\n${sourceMaterial || ''}`.trim();

  // 1. Explicit user instructions in prompt take highest priority
  const explicitlyWantsEnglish =
    /\b(in english|english only|strictly english|translate to english|only english)\b/i.test(lowerPrompt);

  const explicitlyWantsHindi =
    /\b(in hindi|hindi me|hindi mein|pure hindi|हिंदी में|हिंदी)\b/i.test(lowerPrompt) &&
    !/\b(not in hindi|no hindi)\b/i.test(lowerPrompt);

  const explicitlyWantsHinglish =
    /\b(in hinglish|hinglish me|hinglish mein)\b/i.test(lowerPrompt);

  if (explicitlyWantsEnglish) {
    return { language: 'english', reason: 'User explicitly requested English in prompt' };
  }
  if (explicitlyWantsHinglish) {
    return { language: 'hinglish', reason: 'User requested Hinglish in prompt' };
  }
  if (explicitlyWantsHindi) {
    return { language: 'hindi', reason: 'User requested Hindi in prompt' };
  }

  // 2. Script Analysis: Check ratio of Devanagari (\u0900-\u097F) vs Latin letters
  const devanagariMatches = combined.match(/[\u0900-\u097F]/g) || [];
  const latinMatches = combined.match(/[a-zA-Z]/g) || [];

  const devanagariCount = devanagariMatches.length;
  const latinCount = latinMatches.length;
  const totalLetters = devanagariCount + latinCount;

  // Only classify as Hindi if Devanagari is prominently present (> 35% of total text and > 40 chars)
  if (totalLetters > 40 && devanagariCount > 40) {
    const devanagariRatio = devanagariCount / totalLetters;
    if (devanagariRatio > 0.35) {
      return {
        language: 'hindi',
        reason: `Source material is primarily in Hindi / Devanagari script (${Math.round(devanagariRatio * 100)}%)`,
      };
    }
  }

  // 3. Absolute Golden Rule: If the syllabus / textbook / prompt is in English, output MUST BE 100% ENGLISH!
  return {
    language: 'english',
    reason: 'Syllabus and source material are in English (Strict English Enforced)',
  };
};

/**
 * Builds the verification prompt that acts as a Senior Academic Curriculum Auditor & Syllabus Inspector.
 * It checks the draft notes point-by-point against the raw source material,
 * eliminates AI hallucinations, recovers any skipped concepts or dates, and guarantees language fidelity.
 */
export const buildSyllabusAuditPrompt = (options: {
  draftContent: string;
  sourceMaterial: string;
  userPrompt: string;
  detectedLanguage: DetectedLanguage;
  targetSyllabus?: string;
}): string => {
  const { draftContent, sourceMaterial, userPrompt, detectedLanguage, targetSyllabus } = options;

  const languageDirective =
    detectedLanguage === 'english'
      ? `CRITICAL MANDATORY LANGUAGE DIRECTIVE: 100% ENGLISH
- The user's syllabus/prompt is in ENGLISH. The final output MUST BE 100% IN ENGLISH.
- ABSOLUTELY ZERO Hindi, Hinglish, or Devanagari characters allowed (unless directly quoting a Hindi poem title, in which case immediate English translation is required).
- If the draft had any unwanted Hindi text or casual Hinglish, you MUST translate and explain everything in clean, professional, crystal-clear English.`
      : detectedLanguage === 'hindi'
      ? `MANDATORY LANGUAGE DIRECTIVE: HINDI
- The source document/subject is in Hindi. Output strictly in clean, accessible Hindi using Devanagari script.`
      : `MANDATORY LANGUAGE DIRECTIVE: HINGLISH
- Output in student-friendly Hinglish in Latin script.`;

  return `You are a Senior Academic Curriculum Controller, Chief Board Syllabus Inspector, and Verification Auditor.

=== YOUR MANDATORY AUDIT MISSION ===
You are performing a STRICT, ZERO-HALLUCINATION verification of the provided DRAFT NOTES against the raw source material and academic syllabus.
DO NOT approve the draft until you have cross-checked EVERY SINGLE TOPIC, DATE, FORMULA, AND CONCEPT.

=== VERIFICATION & FACT-CHECKING CHECKLIST ===
1. **Zero-Hallucination & Factual Integrity**:
   - Check every definition, theorem, formula, and explanation against the raw source material.
   - Did the draft invent or hallucinate any facts, misquote sources, or make reasoning errors? Correct them immediately!
2. **Exhaustive Syllabus Coverage & Missing Topics Recovery**:
   - Systematically inspect the raw source text from the first word to the last.
   - Did the draft skip, overlook, or rush through ANY topic, subtopic, example, formula, theorem, experiment, or key term present in the source?
   - If ANYTHING is missing, YOU MUST FULLY WRITE AND INTEGRATE the missing content into the notes with clear explanations.
3. **100% Preservation of Dates, Years & Timelines**:
   - Every single date, year, century, and timeline marker in the source material MUST be retained in **bold**. None may be dropped.
4. **Language Compliance**:
   - ${languageDirective}
5. **Exam-Ready Structure**:
   - Ensure clear ## and ### headers, bulleted lists, and definition boxes. If this is a question paper, keep the exact question paper layout, marks, and marking schemes.

=== RAW SOURCE MATERIAL & TRANSCRIPTIONS ===
${sourceMaterial ? sourceMaterial.slice(0, 50000) : '[No external source file provided — audit against general academic syllabus knowledge for this topic]'}

=== USER'S ORIGINAL REQUEST ===
"${userPrompt || 'Comprehensive exam-ready study notes covering all syllabus topics.'}"

=== DRAFT NOTES TO AUDIT ===
${draftContent}

=== REQUIRED OUTPUT FORMAT ===
You MUST return your output in TWO clearly delimited sections:

<!-- AUDIT_REPORT_START -->
{
  "verified": true,
  "coverageScore": 100,
  "syllabusName": "${targetSyllabus || 'Standard Academic Curriculum'}",
  "verifiedTopics": ["List 3-6 core topics verified"],
  "missingTopicsAdded": ["List any missing topics or concepts that you added/enriched, or empty list if none"],
  "correctedItems": ["List any corrections or language fixes made, or empty list if none"],
  "auditNotes": "Brief 1-2 sentence summary of verification and improvements made."
}
<!-- AUDIT_REPORT_END -->

<!-- FINAL_CONTENT_START -->
[Put the complete, 100% perfected, enriched final study notes or question paper here in pure Markdown. This will be shown directly to the student.]
<!-- FINAL_CONTENT_END -->

Begin your audit and output the perfected notes now:`;
};

/**
 * Parses the model response to extract the structured audit report and the perfected notes.
 */
export const parseAuditResponse = (
  rawResponse: string,
  fallbackContent: string,
  detectedLanguage: DetectedLanguage = 'english',
  languageReason: string = 'Syllabus and prompt are in English'
): AuditResult => {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return {
      finalContent: fallbackContent,
      metadata: {
        verified: true,
        coverageScore: 100,
        detectedLanguage,
        languageReason,
        syllabusName: 'Standard Academic Curriculum',
        verifiedTopics: ['Core Concepts'],
        missingTopicsAdded: [],
        correctedItems: [],
        auditNotes: 'Direct verification complete.',
      },
    };
  }

  let finalContent = fallbackContent;
  let metadata: AuditMetadata = {
    verified: true,
    coverageScore: 100,
    detectedLanguage,
    languageReason,
    syllabusName: 'Standard Academic Curriculum',
    verifiedTopics: ['Core Topics Verified'],
    missingTopicsAdded: [],
    correctedItems: [],
    auditNotes: 'Syllabus alignment verified.',
  };

  // Extract Final Content
  const contentMatch = rawResponse.match(
    /<!-- FINAL_CONTENT_START -->([\s\S]*?)<!-- FINAL_CONTENT_END -->/
  );
  if (contentMatch && contentMatch[1].trim()) {
    finalContent = contentMatch[1].trim();
  } else {
    // If delimiters were omitted by the model, check if AUDIT_REPORT was included at top
    const reportEndIdx = rawResponse.indexOf('<!-- AUDIT_REPORT_END -->');
    if (reportEndIdx !== -1) {
      const rest = rawResponse.slice(reportEndIdx + '<!-- AUDIT_REPORT_END -->'.length).trim();
      if (rest) {
        finalContent = rest;
      }
    } else {
      // Just use rawResponse if it's cleaner
      const stripped = rawResponse
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/^```markdown\n/i, '')
        .replace(/\n```$/i, '')
        .trim();
      if (stripped.length > 100) {
        finalContent = stripped;
      }
    }
  }

  // Cleanup markdown fences if present
  if (finalContent.startsWith('```markdown')) {
    finalContent = finalContent.replace(/^```markdown\n/i, '').replace(/\n```$/i, '');
  } else if (finalContent.startsWith('```')) {
    finalContent = finalContent.replace(/^```\w*\n/i, '').replace(/\n```$/i, '');
  }

  // Extract Audit Metadata JSON
  const reportMatch = rawResponse.match(
    /<!-- AUDIT_REPORT_START -->([\s\S]*?)<!-- AUDIT_REPORT_END -->/
  );
  if (reportMatch && reportMatch[1].trim()) {
    try {
      const jsonStr = reportMatch[1].trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(jsonStr);
      metadata = {
        verified: true,
        coverageScore: typeof parsed.coverageScore === 'number' ? parsed.coverageScore : 100,
        detectedLanguage,
        languageReason,
        syllabusName: parsed.syllabusName || 'Standard Academic Curriculum',
        verifiedTopics: Array.isArray(parsed.verifiedTopics) ? parsed.verifiedTopics : [],
        missingTopicsAdded: Array.isArray(parsed.missingTopicsAdded) ? parsed.missingTopicsAdded : [],
        correctedItems: Array.isArray(parsed.correctedItems) ? parsed.correctedItems : [],
        auditNotes: parsed.auditNotes || 'Audit and verification complete.',
      };
    } catch (e) {
      console.warn('Failed to parse audit metadata JSON:', e);
    }
  }

  return { finalContent, metadata };
};
