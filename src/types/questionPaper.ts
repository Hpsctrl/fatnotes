export type QuestionType = 'mcq' | 'vsa' | 'short' | 'medium' | 'long' | 'case';

export type PaperTheme = 'classic-white' | 'modern-academy' | 'vintage-typewriter' | 'aesthetic-dark';

export type DifficultyLevel = 'easy' | 'standard' | 'challenging';

export interface BlueprintSection {
  id: string;
  sectionName: string; // e.g. "Section A", "Section B"
  title: string;       // e.g. "Objective Type Questions (MCQs & VSA)"
  marksPerQuestion: number; // 1, 2, 3, 4, 5, etc.
  questionCount: number;
  questionType: QuestionType;
  instructions?: string;
  hasInternalChoices?: boolean;
}

export interface QuestionPaperHeader {
  institutionName: string;
  examinationName: string;
  subject: string;
  grade: string;
  timeAllowed: string;
  paperCode: string;
  generalInstructions: string[];
}

export interface QuestionPaperConfig {
  header: QuestionPaperHeader;
  difficulty: DifficultyLevel;
  sections: BlueprintSection[];
  includeMarkingScheme: boolean;
  includeInternalChoices: boolean;
  specificTopicsOrInstructions: string;
}

export interface ExamPreset {
  id: string;
  label: string;
  badge: string;
  description: string;
  totalMarks: number;
  timeAllowed: string;
  sections: BlueprintSection[];
}

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'unit-test-20',
    label: 'Weekly Unit Test',
    badge: '20 Marks',
    description: 'Quick 45-minute classroom test (1M, 2M, 3M)',
    totalMarks: 20,
    timeAllowed: '45 Minutes',
    sections: [
      { id: 'sec-a', sectionName: 'SECTION A', title: 'Objective Type (MCQs)', marksPerQuestion: 1, questionCount: 5, questionType: 'mcq' },
      { id: 'sec-b', sectionName: 'SECTION B', title: 'Short Answer Type I', marksPerQuestion: 2, questionCount: 3, questionType: 'short' },
      { id: 'sec-c', sectionName: 'SECTION C', title: 'Short Answer Type II', marksPerQuestion: 3, questionCount: 3, questionType: 'medium', hasInternalChoices: true },
    ]
  },
  {
    id: 'midterm-40',
    label: 'Periodic Assessment',
    badge: '40 Marks',
    description: 'Standard 1.5 Hour Periodic Assessment (1M, 2M, 3M, 5M)',
    totalMarks: 40,
    timeAllowed: '1.5 Hours',
    sections: [
      { id: 'sec-a', sectionName: 'SECTION A', title: 'Objective & Multiple Choice', marksPerQuestion: 1, questionCount: 10, questionType: 'mcq' },
      { id: 'sec-b', sectionName: 'SECTION B', title: 'Very Short Answer Questions', marksPerQuestion: 2, questionCount: 4, questionType: 'short' },
      { id: 'sec-c', sectionName: 'SECTION C', title: 'Short Answer Questions', marksPerQuestion: 3, questionCount: 4, questionType: 'medium', hasInternalChoices: true },
      { id: 'sec-d', sectionName: 'SECTION D', title: 'Long Answer Questions', marksPerQuestion: 5, questionCount: 2, questionType: 'long', hasInternalChoices: true },
    ]
  },
  {
    id: 'board-80',
    label: 'Full Board Exam',
    badge: '80 Marks',
    description: 'Authentic 3-Hour Board / Final Exam Pattern (1M, 2M, 3M, 4M Case, 5M Long)',
    totalMarks: 80,
    timeAllowed: '3 Hours',
    sections: [
      { id: 'sec-a', sectionName: 'SECTION A', title: 'Multiple Choice & Assertion-Reason', marksPerQuestion: 1, questionCount: 16, questionType: 'mcq' },
      { id: 'sec-b', sectionName: 'SECTION B', title: 'Very Short Answer Questions (30-50 words)', marksPerQuestion: 2, questionCount: 5, questionType: 'short' },
      { id: 'sec-c', sectionName: 'SECTION C', title: 'Short Answer Questions (50-80 words)', marksPerQuestion: 3, questionCount: 7, questionType: 'medium', hasInternalChoices: true },
      { id: 'sec-d', sectionName: 'SECTION D', title: 'Long Answer Questions (80-120 words)', marksPerQuestion: 5, questionCount: 3, questionType: 'long', hasInternalChoices: true },
      { id: 'sec-e', sectionName: 'SECTION E', title: 'Case-Based / Source-Based Integrated', marksPerQuestion: 4, questionCount: 2, questionType: 'case' },
    ]
  },
  {
    id: 'mcq-drill-25',
    label: 'Pure MCQ Speed Drill',
    badge: '25 Marks',
    description: '25 Objective & Multiple Choice Questions',
    totalMarks: 25,
    timeAllowed: '30 Minutes',
    sections: [
      { id: 'sec-a', sectionName: 'SECTION A', title: 'Multiple Choice Questions (4 Options)', marksPerQuestion: 1, questionCount: 25, questionType: 'mcq' }
    ]
  }
];

export const DEFAULT_QUESTION_PAPER_HEADER: QuestionPaperHeader = {
  institutionName: 'CENTRAL BOARD OF SECONDARY EDUCATION',
  examinationName: 'ANNUAL EXAMINATION / SAMPLE QUESTION PAPER 2025–26',
  subject: 'General Science & Concepts',
  grade: 'Class X / Standard',
  timeAllowed: '3 Hours',
  paperCode: 'QP-2026/01-A',
  generalInstructions: [
    'This question paper contains 4 sections: Section A, Section B, Section C, and Section D.',
    'Section A comprises 10 Multiple Choice Questions (MCQs) of 1 mark each. All questions are compulsory.',
    'Section B comprises 3 Very Short Answer questions of 2 marks each (30 to 50 words).',
    'Section C comprises 3 Short Answer questions of 3 marks each (50 to 80 words).',
    'Section D comprises 2 Long Answer questions of 5 marks each (80 to 120 words).',
    'Internal choice has been provided in Section C and Section D.',
    'Use of calculators or unauthorized electronic devices is strictly prohibited.'
  ]
};

export const DEFAULT_QUESTION_PAPER = `# DELHI PUBLIC SCHOOL, R.K. PURAM
### ANNUAL EXAMINATION (MODEL QUESTION PAPER) — 2025–26
**Subject:** General Science (086) | **Class:** Class X | **Paper Code:** 55/1/1
**Time Allowed:** 3 Hours | **Maximum Marks:** 35

---
### GENERAL INSTRUCTIONS:
1. Please check that this question paper contains all 18 questions before answering.
2. Section A contains 10 Multiple Choice Questions (MCQs) of 1 mark each.
3. Section B contains 3 Very Short Answer questions of 2 marks each (30 to 50 words).
4. Section C contains 3 Short Answer questions of 3 marks each (50 to 80 words).
5. Section D contains 2 Long Answer questions of 5 marks each (80 to 120 words).
6. Internal choice has been provided in Section C and Section D.
---

## SECTION - A (Objective Type Questions - 1 Mark each)

**Q1.** Which of the following cell organelles is known as the "powerhouse of the cell"? [1]
   (A) Endoplasmic Reticulum
   (B) Mitochondria
   (C) Golgi Apparatus
   (D) Lysosome

**Q2.** An electric bulb is rated 220 V and 100 W. When it is operated on 110 V, the power consumed will be: [1]
   (A) 100 W
   (B) 75 W
   (C) 50 W
   (D) 25 W

**Q3.** Which acid is present naturally in tomatoes? [1]
   (A) Methanoic acid
   (B) Acetic acid
   (C) Oxalic acid
   (D) Tartaric acid

**Q4.** The focal length of a plane mirror is: [1]
   (A) Zero
   (B) +25 cm
   (C) -25 cm
   (D) Infinity

---

## SECTION - B (Very Short Answer Questions - 2 Marks each)

**Q5.** Write the balanced chemical equation for the reaction between sodium hydroxide and hydrochloric acid. What type of reaction is this? [2]

**Q6.** State Snell’s law of refraction and write its mathematical formula. [2]

**Q7.** Differentiate between biodegradable and non-biodegradable substances with one example each. [2]

---

## SECTION - C (Short Answer Questions - 3 Marks each)

**Q8.** Explain the mechanism of double circulation in humans. Why is it necessary in mammals and birds? [3]

**Q9.** Three resistors of resistances 2 Ω, 3 Ω, and 6 Ω are connected in parallel. Calculate the equivalent resistance of the combination. [3]

**OR**

State Ohm’s law. Draw the V-I graph for an ohmic conductor and state how resistance is determined from its slope. [3]

---

## SECTION - D (Long Answer Questions - 5 Marks each)

**Q10.** (a) Define electric potential difference between two points. State its SI unit. [2]
(b) State Joule's law of heating and derive the expression $H = I^2 R t$. [2]
(c) Why is tungsten used almost exclusively for filament of incandescent lamps? [1]

**OR**

(a) Draw a neat labeled diagram of the human nephron. [2]
(b) Name the structural and functional filtration unit of kidneys. [1]
(c) Describe the three main stages of urine formation. [2]

<!-- MARKING_SCHEME_START -->
# MARKING SCHEME & STEP-BY-STEP SOLUTIONS
### Complete Model Answers and Evaluation Rubric

**Ans 1:** **(B) Mitochondria** [1 Mark]
*Explanation: Mitochondria generate cellular energy in the form of ATP via cellular respiration.*

**Ans 2:** **(D) 25 W** [1 Mark]
*Explanation: Resistance $R = V^2 / P = (220)^2 / 100 = 484\\,\\Omega$. At $110\\text{ V}$, power consumed $P' = V'^2 / R = (110)^2 / 484 = 25\\text{ W}$.*

**Ans 3:** **(C) Oxalic acid** [1 Mark]

**Ans 4:** **(D) Infinity** [1 Mark]

**Ans 5:**
- Equation: $\\text{NaOH} + \\text{HCl} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}$ [1 Mark]
- Type: Neutralization reaction (double displacement reaction). [1 Mark]

**Ans 6:**
- Statement: The ratio of sine of angle of incidence to the sine of angle of refraction is constant for a given pair of media. [1 Mark]
- Formula: $\\frac{\\sin i}{\\sin r} = n_{21}$ (refractive index) [1 Mark]

**Ans 8:**
- Double circulation: Blood travels through the heart twice in one complete cardiac cycle (pulmonary and systemic circulation). [1.5 Marks]
- Necessity: Prevents mixing of oxygenated and deoxygenated blood, providing efficient oxygen supply to maintain constant body temperature. [1.5 Marks]

**Ans 10:**
- (a) Potential Difference: Work done per unit electric charge in moving it between two points ($V = W/Q$). SI unit: Volt (V). [2 Marks]
- (b) Derivation: Work done $W = V \\cdot Q$. Since $Q = I \\cdot t$ and $V = I \\cdot R$, $W = (I \\cdot R)(I \\cdot t) = I^2 R t$. [2 Marks]
- (c) Tungsten has a very high melting point ($3422^\\circ\\text{C}$) and high resistivity, so it glows brightly without melting or oxidizing easily. [1 Mark]
<!-- PAPER_END -->
`;

