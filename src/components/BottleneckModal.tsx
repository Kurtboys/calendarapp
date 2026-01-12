import { useState } from 'react';
import { useDayStart } from '../context/DayStartContext';

interface BottleneckModalProps {
  onClose: () => void;
}

type Step = 'describe' | 'impedes';

export function BottleneckModal({ onClose }: BottleneckModalProps) {
  const { reportBottleneck } = useDayStart();
  const [step, setStep] = useState<Step>('describe');
  const [reason, setReason] = useState('');

  const handleNext = () => {
    if (!reason.trim()) return;
    setStep('impedes');
  };

  const handleImpedes = (impedes: boolean) => {
    reportBottleneck(reason.trim(), impedes);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {step === 'describe' && (
          <>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              What's the bottleneck?
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Describe what's blocking your progress
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Waiting for API access, need design feedback, blocked by dependency..."
              className="w-full h-32 px-4 py-3 rounded-xl text-base resize-none mb-6"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!reason.trim()}
                className="flex-1 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'impedes' && (
          <>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Does this stop you from continuing?
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              "{reason}"
            </p>
            <p
              className="mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Does this bottleneck prevent you from moving forward with this mission right now?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleImpedes(true)}
                className="w-full py-4 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--color-priority-urgent)',
                  color: 'white',
                }}
              >
                <span className="block font-bold">Yes, I'm completely blocked</span>
                <span className="block text-sm opacity-80 mt-1">
                  Move this mission to Bottlenecks and create a fix mission
                </span>
              </button>

              <button
                onClick={() => handleImpedes(false)}
                className="w-full py-4 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--color-priority-medium)',
                  color: 'white',
                }}
              >
                <span className="block font-bold">No, I can continue for now</span>
                <span className="block text-sm opacity-80 mt-1">
                  Add a mission to address this later
                </span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
