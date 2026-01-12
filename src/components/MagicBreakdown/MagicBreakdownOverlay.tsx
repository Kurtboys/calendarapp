import { useState, useEffect } from 'react';
import { useAI } from '../../context/AIContext';
import type { GeneratedCheckpoint } from '../../types';
import { formatDuration } from '../../utils/date';

interface MagicBreakdownOverlayProps {
  onAccept: (checkpoints: GeneratedCheckpoint[], totalMinutes: number) => void;
  onCancel: () => void;
}

export function MagicBreakdownOverlay({ onAccept, onCancel }: MagicBreakdownOverlayProps) {
  const {
    breakdownFlow,
    answerQuestion,
    submitAnswersAndGenerate,
    cancelBreakdown,
    acceptBreakdown,
  } = useAI();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAddDetail, setShowAddDetail] = useState(false);
  const [customDetailText, setCustomDetailText] = useState('');
  const [freeformText, setFreeformText] = useState('');

  // Reset state when question changes
  useEffect(() => {
    setShowAddDetail(false);
    setCustomDetailText('');
    setFreeformText('');
  }, [currentQuestionIndex]);

  if (!breakdownFlow) return null;

  const handleCancel = () => {
    cancelBreakdown();
    onCancel();
  };

  const handleAccept = () => {
    const result = acceptBreakdown();
    if (result) {
      onAccept(result.checkpoints, result.totalEstimatedMinutes);
    }
  };

  // Context Questions Step
  if (breakdownFlow.step === 'context-questions' && breakdownFlow.questions) {
    const question = breakdownFlow.questions[currentQuestionIndex];
    const answer = breakdownFlow.answers?.find(a => a.questionId === question.id);
    const selectedOptions = answer?.selectedOptions || [];
    const isFreeformQuestion = question.isFreeform;
    const isOptional = question.isOptional;

    const handleOptionSelect = (optionIndex: number) => {
      let newSelected: number[];

      if (question.allowMultiple) {
        // Toggle option
        if (selectedOptions.includes(optionIndex)) {
          newSelected = selectedOptions.filter(i => i !== optionIndex);
        } else {
          newSelected = [...selectedOptions, optionIndex];
        }
      } else {
        // Single select
        newSelected = [optionIndex];
      }

      answerQuestion(question.id, newSelected, customDetailText || undefined);
    };

    const handleAllOfAbove = () => {
      answerQuestion(question.id, [0, 1, 2], customDetailText || undefined);
    };

    const handleAddDetailToggle = () => {
      setShowAddDetail(!showAddDetail);
    };

    const handleCustomDetailChange = (text: string) => {
      setCustomDetailText(text);
      // Update answer with custom detail
      answerQuestion(question.id, selectedOptions, text || undefined);
    };

    const handleFreeformChange = (text: string) => {
      setFreeformText(text);
      answerQuestion(question.id, [], undefined, text || undefined);
    };

    // For regular questions: need at least one option selected (or can skip if optional)
    // For freeform: optional, so always can proceed
    const canProceed = isFreeformQuestion || selectedOptions.length > 0 || isOptional;
    const isLastQuestion = currentQuestionIndex === breakdownFlow.questions.length - 1;

    const handleNext = () => {
      // Save the current answer before moving on
      if (isFreeformQuestion) {
        answerQuestion(question.id, [], undefined, freeformText || undefined);
      } else if (showAddDetail && customDetailText) {
        answerQuestion(question.id, selectedOptions, customDetailText);
      }

      if (isLastQuestion) {
        submitAnswersAndGenerate();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    };

    const handleSkip = () => {
      // Skip optional question
      answerQuestion(question.id, [], undefined, undefined);
      if (isLastQuestion) {
        submitAnswersAndGenerate();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    };

    const handleBack = () => {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
      }
    };

    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Question {currentQuestionIndex + 1} of {breakdownFlow.questions.length}
                {isOptional && ' (Optional)'}
              </p>
              <h2
                className="text-lg font-bold mt-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {breakdownFlow.taskTitle}
              </h2>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:opacity-70"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="h-1 rounded-full mb-6"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                backgroundColor: 'var(--color-accent)',
                width: `${((currentQuestionIndex + 1) / breakdownFlow.questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Question */}
          <p
            className="text-lg font-medium mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {question.question}
          </p>

          {/* Freeform question (6th question) */}
          {isFreeformQuestion ? (
            <div className="mb-6">
              <p
                className="text-sm mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                The more context you provide, the more accurate your checkpoints will be. This is optional - skip if you don't have anything to add.
              </p>
              <textarea
                value={freeformText}
                onChange={(e) => handleFreeformChange(e.target.value)}
                placeholder="Any additional context, special requirements, or things I should know..."
                rows={4}
                className="w-full p-4 rounded-xl resize-none"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>
          ) : (
            <>
              {/* Multiple choice options */}
              <div className="space-y-2 mb-4">
                {question.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className="w-full p-4 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: selectedOptions.includes(idx)
                        ? 'var(--color-accent-light)'
                        : 'var(--color-background)',
                      border: selectedOptions.includes(idx)
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-medium"
                      style={{
                        color: selectedOptions.includes(idx)
                          ? 'var(--color-accent)'
                          : 'var(--color-text-primary)',
                      }}
                    >
                      {option}
                    </span>
                  </button>
                ))}

                {/* All of the above option */}
                {question.allowMultiple && (
                  <button
                    onClick={handleAllOfAbove}
                    className="w-full p-4 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: selectedOptions.length === 3
                        ? 'var(--color-accent-light)'
                        : 'var(--color-background)',
                      border: selectedOptions.length === 3
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-medium"
                      style={{
                        color: selectedOptions.length === 3
                          ? 'var(--color-accent)'
                          : 'var(--color-text-primary)',
                      }}
                    >
                      All of the above
                    </span>
                  </button>
                )}

                {/* Add more detail option */}
                <button
                  onClick={handleAddDetailToggle}
                  className="w-full p-4 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: showAddDetail
                      ? 'var(--color-surface)'
                      : 'var(--color-background)',
                    border: showAddDetail
                      ? '2px solid var(--color-text-tertiary)'
                      : '1px dashed var(--color-border)',
                  }}
                >
                  <span
                    className="font-medium flex items-center gap-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    I want to add more detail (optional)
                  </span>
                </button>
              </div>

              {/* Custom detail text area */}
              {showAddDetail && (
                <div className="mb-4">
                  <textarea
                    value={customDetailText}
                    onChange={(e) => handleCustomDetailChange(e.target.value)}
                    placeholder="Add any specific details that might help..."
                    rows={3}
                    className="w-full p-3 rounded-xl resize-none text-sm"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                    }}
                    autoFocus
                  />
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {currentQuestionIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-3 rounded-xl font-medium"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Back
              </button>
            )}
            {isOptional && (
              <button
                onClick={handleSkip}
                className="px-4 py-3 rounded-xl font-medium"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-tertiary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1 py-3 rounded-xl font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              {isLastQuestion ? 'Generate Breakdown' : 'Next'}
            </button>
          </div>

          {breakdownFlow.error && (
            <p
              className="mt-4 text-sm text-center"
              style={{ color: 'var(--color-priority-urgent)' }}
            >
              {breakdownFlow.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Generating Step
  if (breakdownFlow.step === 'generating') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Loading spinner */}
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full border-4 animate-spin"
            style={{
              borderColor: 'var(--color-border)',
              borderTopColor: 'var(--color-accent)',
            }}
          />
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Breaking it down...
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Creating personalized checkpoints for "{breakdownFlow.taskTitle}"
          </p>
        </div>
      </div>
    );
  }

  // Review Step
  if (breakdownFlow.step === 'review' && breakdownFlow.result) {
    const { checkpoints, totalEstimatedMinutes } = breakdownFlow.result;

    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Your Breakdown
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {checkpoints.length} checkpoints &middot; {formatDuration(totalEstimatedMinutes)} total
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:opacity-70"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Checkpoints list */}
          <div
            className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2"
            style={{ maxHeight: '50vh' }}
          >
            {checkpoints.map((cp, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--color-accent)',
                  }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {cp.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {cp.estimatedMinutes} min
                    </span>
                    {cp.reasoning && (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {cp.reasoning}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-3 rounded-xl font-medium"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-3 rounded-xl font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              Use These Checkpoints
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
