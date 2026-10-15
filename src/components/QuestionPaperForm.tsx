import React, { useState } from 'react';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Check,
  Zap,
  BookOpen,
  Key
} from 'lucide-react';
import { EXAM_PRESETS } from '../types/questionPaper';
import type { QuestionPaperConfig, DifficultyLevel } from '../types/questionPaper';
import './QuestionPaperForm.css';

interface QuestionPaperFormProps {
  sourceFile: File | null;
  onFileSelect: () => void;
  config: QuestionPaperConfig;
  onChangeConfig: (newConfig: QuestionPaperConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  aiProvider: 'gemini' | 'groq' | 'openrouter';
  activeKey: string;
}

export const QuestionPaperForm: React.FC<QuestionPaperFormProps> = ({
  sourceFile,
  onFileSelect,
  config,
  onChangeConfig,
  onGenerate,
  isGenerating,
  aiProvider,
  activeKey,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('midterm-40');
  const [showHeaderSettings, setShowHeaderSettings] = useState<boolean>(false);

  // Total calculated marks & questions
  const totalMarks = config.sections.reduce(
    (acc, sec) => acc + sec.marksPerQuestion * sec.questionCount,
    0
  );
  const totalQuestions = config.sections.reduce((acc, sec) => acc + sec.questionCount, 0);

  // Handle Preset selection
  const handleSelectPreset = (presetId: string) => {
    const preset = EXAM_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    onChangeConfig({
      ...config,
      header: {
        ...config.header,
        timeAllowed: preset.timeAllowed,
      },
      sections: JSON.parse(JSON.stringify(preset.sections)),
    });
  };

  // Modify question count in section
  const handleUpdateCount = (sectionId: string, delta: number) => {
    const updated = config.sections.map(sec => {
      if (sec.id === sectionId) {
        const newCount = Math.max(0, sec.questionCount + delta);
        return { ...sec, questionCount: newCount };
      }
      return sec;
    });
    setSelectedPresetId('custom');
    onChangeConfig({ ...config, sections: updated });
  };

  // Handle header metadata change
  const handleHeaderChange = (field: keyof typeof config.header, value: string) => {
    onChangeConfig({
      ...config,
      header: {
        ...config.header,
        [field]: value,
      },
    });
  };

  return (
    <div className="qp-form-root">
      {/* ─── 1. Source Material (PDF / Image / Notes) ─── */}
      <div className="form-section">
        <label>1. Source Material / Syllabus (Optional if topic entered)</label>
        <div
          className={`file-drop-area ${sourceFile ? 'active' : ''}`}
          onClick={onFileSelect}
        >
          {sourceFile ? (
            <div className="file-info">
              <CheckCircle2 color="var(--accent)" size={24} />
              <span>{sourceFile.name} ({(sourceFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              <small>Click to change file</small>
            </div>
          ) : (
            <div className="file-placeholder">
              <UploadCloud size={28} />
              <span>Upload Textbook Chapter, Notes, or Syllabus PDF/Image</span>
              <small>Or leave empty and specify topics in the box below</small>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. Quick Exam Presets ─── */}
      <div className="qp-presets-container">
        <span className="qp-presets-label">2. Choose Exam Blueprint Preset</span>
        <div className="qp-presets-grid">
          {EXAM_PRESETS.map(preset => (
            <button
              key={preset.id}
              className={`qp-preset-btn ${selectedPresetId === preset.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(preset.id)}
            >
              <div className="qp-preset-header">
                <span className="qp-preset-title">{preset.label}</span>
                <span className="qp-preset-badge">{preset.badge}</span>
              </div>
              <span className="qp-preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. Interactive Marks Breakdown Builder ─── */}
      <div className="qp-blueprint-card">
        <div className="qp-blueprint-header">
          <div className="qp-blueprint-title">
            <Sliders size={16} color="#2563eb" />
            <span>Customize Question Marks Distribution</span>
          </div>
          <div className="qp-total-marks-pill">
            <span>Total:</span>
            <span className="highlight">{totalMarks} Marks</span>
            <span>({totalQuestions} Qs)</span>
          </div>
        </div>

        <div className="qp-sections-list">
          {config.sections.map(section => (
            <div key={section.id} className="qp-section-row">
              <div className="qp-section-info">
                <div className="qp-section-name">
                  <span>{section.sectionName}:</span>
                  <span className="qp-section-marks-badge">{section.marksPerQuestion} Mark{section.marksPerQuestion > 1 ? 's' : ''} Each</span>
                </div>
                <span className="qp-section-subtitle">{section.title}</span>
              </div>

              {/* Counter Controls */}
              <div className="qp-counter">
                <button
                  className="qp-counter-btn"
                  onClick={() => handleUpdateCount(section.id, -1)}
                  disabled={section.questionCount <= 0}
                  title="Decrease questions"
                >
                  <Minus size={12} />
                </button>
                <span className="qp-counter-val">{section.questionCount}</span>
                <button
                  className="qp-counter-btn"
                  onClick={() => handleUpdateCount(section.id, 1)}
                  title="Increase questions"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="qp-section-subtotal">
                = {section.questionCount * section.marksPerQuestion}M
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Exam Header & Institutional Details (Collapsible) ─── */}
      <div className="qp-collapsible-card">
        <div
          className="qp-collapsible-header"
          onClick={() => setShowHeaderSettings(!showHeaderSettings)}
        >
          <span>🏫 Institution & Exam Header Details</span>
          {showHeaderSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {showHeaderSettings && (
          <div className="qp-collapsible-body">
            <div className="qp-input-grid">
              <div className="qp-field-wrap qp-input-full">
                <label>Institution / School Name</label>
                <input
                  type="text"
                  value={config.header.institutionName}
                  onChange={e => handleHeaderChange('institutionName', e.target.value)}
                  placeholder="e.g. DELHI PUBLIC SCHOOL / APEX UNIVERSITY"
                />
              </div>

              <div className="qp-field-wrap">
                <label>Examination Title</label>
                <input
                  type="text"
                  value={config.header.examinationName}
                  onChange={e => handleHeaderChange('examinationName', e.target.value)}
                  placeholder="e.g. MID-TERM EXAMINATION 2025-26"
                />
              </div>

              <div className="qp-field-wrap">
                <label>Subject</label>
                <input
                  type="text"
                  value={config.header.subject}
                  onChange={e => handleHeaderChange('subject', e.target.value)}
                  placeholder="e.g. Physics / Chemistry / Mathematics"
                />
              </div>

              <div className="qp-field-wrap">
                <label>Class / Grade</label>
                <input
                  type="text"
                  value={config.header.grade}
                  onChange={e => handleHeaderChange('grade', e.target.value)}
                  placeholder="e.g. Class X / Class XII"
                />
              </div>

              <div className="qp-field-wrap">
                <label>Time Allowed</label>
                <input
                  type="text"
                  value={config.header.timeAllowed}
                  onChange={e => handleHeaderChange('timeAllowed', e.target.value)}
                  placeholder="e.g. 3 Hours / 1.5 Hours"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. Exam Settings & Controls ─── */}
      <div className="qp-options-row">
        {/* Difficulty Selector */}
        <div className="qp-diff-pills">
          {(['easy', 'standard', 'challenging'] as DifficultyLevel[]).map(diff => (
            <button
              key={diff}
              className={`qp-diff-btn ${config.difficulty === diff ? 'active' : ''}`}
              onClick={() => onChangeConfig({ ...config, difficulty: diff })}
            >
              {diff === 'easy' ? '🌱 Easy' : diff === 'standard' ? '⚖️ Balanced' : '🔥 HOTS / Hard'}
            </button>
          ))}
        </div>

        {/* Include Marking Scheme Toggle */}
        <button
          className={`qp-toggle-pill ${config.includeMarkingScheme ? 'active' : ''}`}
          onClick={() =>
            onChangeConfig({
              ...config,
              includeMarkingScheme: !config.includeMarkingScheme,
            })
          }
        >
          <Key size={13} />
          {config.includeMarkingScheme && <Check size={13} />}
          Marking Scheme & Answers
        </button>

        {/* Include Internal Choice Toggle */}
        <button
          className={`qp-toggle-pill ${config.includeInternalChoices ? 'active' : ''}`}
          onClick={() =>
            onChangeConfig({
              ...config,
              includeInternalChoices: !config.includeInternalChoices,
            })
          }
        >
          {config.includeInternalChoices && <Check size={13} />}
          Internal Choices (OR)
        </button>
      </div>

      {/* ─── 6. Specific Topics / Custom Instructions ─── */}
      <div className="form-section fill-height">
        <label>3. Chapters / Specific Topics & Instructions</label>
        <textarea
          className="prompt-textarea"
          value={config.specificTopicsOrInstructions}
          onChange={e =>
            onChangeConfig({
              ...config,
              specificTopicsOrInstructions: e.target.value,
            })
          }
          placeholder={`Enter topic or specific chapters to test! Examples:
• "Chapter 1: Real Numbers + Chapter 2: Polynomials + Chapter 3: Quadratic Equations"
• "Thermodynamics and Kinetic Theory — focus on derivations and numerical problems"
• "Computer Networks: OSI Model, TCP/IP, IP addressing and Subnetting"
• "Class 10 Biology: Life Processes (Nutrition & Respiration)"`}
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* ─── 7. Generate Button ─── */}
      <div className="form-action">
        <button
          id="generate-qp-btn"
          className={`btn-generate ${aiProvider === 'groq' ? 'groq-btn' : aiProvider === 'openrouter' ? 'or-btn' : ''}`}
          onClick={onGenerate}
          disabled={isGenerating || (!sourceFile && !config.specificTopicsOrInstructions) || !activeKey}
        >
          {isGenerating ? (
            <>
              <Sparkles className="animate-pulse" size={18} />
              {aiProvider === 'groq'
                ? 'Groq is Drafting Exam Paper & Marking Scheme...'
                : aiProvider === 'openrouter'
                ? 'OpenRouter is Compiling Exam Paper...'
                : 'AI is Structuring Question Paper & Rubric...'}
            </>
          ) : (
            <>
              {aiProvider === 'groq' ? (
                <Zap size={18} />
              ) : aiProvider === 'openrouter' ? (
                <BookOpen size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              Generate Question Paper ({totalMarks} Marks)
            </>
          )}
        </button>

        {!activeKey && (
          <p className="key-warning">
            Open settings to add your {aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'groq' ? 'Groq' : 'OpenRouter'} API key.
          </p>
        )}
      </div>
    </div>
  );
};
