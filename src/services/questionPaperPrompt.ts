import type { QuestionPaperConfig } from '../types/questionPaper';

export const buildQuestionPaperPrompt = (
  config: QuestionPaperConfig,
  customNotesOrContext: string = ''
): string => {
  const totalCalculatedMarks = config.sections.reduce(
    (acc, sec) => acc + sec.marksPerQuestion * sec.questionCount,
    0
  );

  const sectionsSummary = config.sections
    .map((sec, idx) => {
      const charCode = String.fromCharCode(65 + idx); // A, B, C, ...
      return `- **SECTION ${charCode} (${sec.title})**: Exactly ${sec.questionCount} questions × ${sec.marksPerQuestion} mark(s) each = ${sec.questionCount * sec.marksPerQuestion} Marks. Type: ${sec.questionType.toUpperCase()}.${sec.hasInternalChoices ? ' (Include internal choice "OR" for at least 1-2 questions)' : ''}`;
    })
    .join('\n');

  return `You are an elite Examination Controller, Senior Curriculum Specialist, and Master Question Paper Creator.
Your mission is to generate an AUTHENTIC, EXAM-READY, REALISTIC QUESTION PAPER based on the provided material/topics.

=== EXAMINATION BLUEPRINT & SPECIFICATIONS ===
- **Institution Name**: ${config.header.institutionName || 'CENTRAL ACADEMY OF HIGHER LEARNING'}
- **Examination Title**: ${config.header.examinationName || 'FINAL TERM EXAMINATION / MODEL QUESTION PAPER'}
- **Subject**: ${config.header.subject || 'General Studies & Science'}
- **Class / Grade**: ${config.header.grade || 'Standard / Level'}
- **Time Allowed**: ${config.header.timeAllowed || '3 Hours'}
- **Maximum Marks**: ${totalCalculatedMarks} Marks
- **Difficulty Level**: ${config.difficulty.toUpperCase()} (Ensure questions test concept clarity, application, problem-solving, and analytical thinking)
- **Paper Code**: ${config.header.paperCode || 'QP-2026/SET-A'}

=== QUESTION DISTRIBUTION (STRICT COMPLIANCE REQUIRED) ===
${sectionsSummary}

=== ADDITIONAL USER INSTRUCTIONS / TOPIC FOCUS ===
"${config.specificTopicsOrInstructions || 'Generate comprehensive questions covering all key concepts from the source material with balanced difficulty.'}"

=== CRITICAL RULES: DATES, YEARS & ACCURACY ===
- When questions or source material involve history, literature, scientific discoveries, or authors, ALWAYS preserve exact dates, years, timelines, and biographical periods (e.g. 1861, 1913, 1823) in questions, answer options, and marking schemes without error.

${customNotesOrContext ? `\n=== SOURCE STUDY MATERIAL / SYLLABUS ===\n${customNotesOrContext}\n` : ''}

=== CRITICAL FORMATTING & STRUCTURE RULES ===

1. Output ONLY pure Markdown text. Do NOT wrap everything in \`\`\`markdown code fence blocks.
2. The Question Paper MUST follow this EXACT standard layout:

\`\`\`
# ${config.header.institutionName.toUpperCase()}
### ${config.header.examinationName.toUpperCase()}
**Subject:** ${config.header.subject} | **Class:** ${config.header.grade} | **Paper Code:** ${config.header.paperCode}
**Time Allowed:** ${config.header.timeAllowed} | **Maximum Marks:** ${totalCalculatedMarks}

---
### GENERAL INSTRUCTIONS:
1. Please check that this question paper contains all specified questions before answering.
2. All questions are compulsory. Internal choice is provided in certain questions.
3. Section A contains 1-mark questions (MCQs/Objective/VSA).
4. Section B contains 2-mark very short answer questions (30 to 50 words).
5. Section C contains 3-mark short answer questions (50 to 80 words).
6. Section D contains 5-mark long answer questions (80 to 120 words).
7. Write clear, legible answers with proper formulas, diagrams, and step-by-step reasoning.
---
\`\`\`

3. **Sections & Question Formatting Rules**:
   - Number questions sequentially across the whole paper (Q1, Q2, Q3, ... Q${config.sections.reduce((a, b) => a + b.questionCount, 0)}).
   - Put marks in bold square brackets at the right end of each question, e.g. \`[1]\`, \`[2]\`, \`[3]\`, \`[5]\`.
   - **For 1-Mark MCQs**:
     Provide 4 clear, plausible options formatted on separate indented lines:
     \`\`\`
     **Q1.** What happens when ... ? [1]
        (A) Option 1
        (B) Option 2
        (C) Option 3
        (D) Option 4
     \`\`\`
   - **For 2-Mark & 3-Mark Questions**:
     Provide clear, crisp conceptual or numerical questions.
     If internal choice is requested, format as:
     \`\`\`
     **Q7.** Explain the principle of ... [3]
     
     **OR**
     
     State the laws of ... and give one practical application. [3]
     \`\`\`
   - **For 5-Mark Questions**:
     Break them into realistic sub-parts: (a), (b), (c) with specific mark values (e.g. \`(a) Define ... [2]\`, \`(b) Derive ... [2]\`, \`(c) Find ... [1]\`).
   - **For 4-Mark Case-Based Questions**:
     Provide a realistic case passage/data snippet followed by 3-4 analytical sub-questions.

4. **MARKING SCHEME & DETAILED SOLUTIONS (MANDATORY)**:
   At the very end of the Question Paper, add the exact delimiter line:
   \`<!-- MARKING_SCHEME_START -->\`
   followed by:
   \`# MARKING SCHEME & HINTS / SOLUTIONS\`
   \`### Complete Answers with Step-by-Step Mark Allocation\`

   For EVERY single question (Q1, Q2, Q3, etc.):
   - State the final answer / correct option clearly.
   - Provide a step-by-step marking rubric (e.g. \`[1/2 mark for formula, 1 mark for substitution, 1/2 mark for final unit]\` or \`[1 mark each for 2 distinct points]\`).
   - For MCQs: \`**Ans 1:** **(B) Option Name** - *Explanation: Brief 1-line reason why this is correct.* [1 Mark]\`
   - For subjective questions: Provide model points with bulleted mark allocations.

5. End the whole response with:
   \`<!-- PAPER_END -->\`

Begin generating the complete examination paper now!`;
};
