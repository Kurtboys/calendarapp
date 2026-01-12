import { useDayStart } from '../context/DayStartContext';
import { ENERGY_STATES, type EnergyState } from '../types';

export function EnergySelectionOverlay() {
  const { loginFlow, selectEnergyState } = useDayStart();

  if (!loginFlow || loginFlow.step !== 'energy-selection') return null;

  const handleSelectEnergy = (energy: EnergyState) => {
    selectEnergyState(energy);
  };

  const energyOptions: EnergyState[] = ['low', 'normal', 'high'];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            How are you feeling today?
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            This helps us recommend the best order for your missions
          </p>
        </div>

        {/* Energy Options */}
        <div className="space-y-3">
          {energyOptions.map((energy) => {
            const state = ENERGY_STATES[energy];
            return (
              <button
                key={energy}
                onClick={() => handleSelectEnergy(energy)}
                className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{state.icon}</span>
                  <div className="flex-1">
                    <p
                      className="font-semibold text-lg mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {state.label}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {state.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
