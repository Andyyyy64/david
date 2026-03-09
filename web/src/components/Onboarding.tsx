import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
  onOpenSettings: () => void;
}

const STORAGE_KEY = 'homelife_onboarded';

export function isOnboarded(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function Onboarding({ onClose, onOpenSettings }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  }, [onClose]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); },
    [finish],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  return (
    <div
      className="onboarding-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) finish(); }}
    >
      <div className="onboarding-modal">
        {/* Step indicator */}
        <div className="onboarding-stepper">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="onboarding-body">
          {step === 0 && (
            <>
              <h2 className="onboarding-title">{t('onboarding.welcome.title')}</h2>
              <p className="onboarding-description">{t('onboarding.welcome.description')}</p>
              <div className="onboarding-pillars">
                <div className="onboarding-pillar">
                  <span className="onboarding-pillar-icon">1</span>
                  <span className="onboarding-pillar-label">Monitoring</span>
                </div>
                <div className="onboarding-pillar">
                  <span className="onboarding-pillar-icon">2</span>
                  <span className="onboarding-pillar-label">Management</span>
                </div>
                <div className="onboarding-pillar">
                  <span className="onboarding-pillar-icon">3</span>
                  <span className="onboarding-pillar-label">Analysis</span>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="onboarding-title">{t('onboarding.setup.title')}</h2>
              <p className="onboarding-description">{t('onboarding.setup.description')}</p>
              <button
                className="onboarding-settings-btn"
                onClick={() => {
                  finish();
                  onOpenSettings();
                }}
              >
                {t('onboarding.setup.openSettings')}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="onboarding-title">{t('onboarding.start.title')}</h2>
              <p className="onboarding-description">{t('onboarding.start.description')}</p>
              <code className="onboarding-command">life start</code>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <button className="onboarding-skip-btn" onClick={finish}>
            {t('onboarding.skip')}
          </button>
          <div className="onboarding-nav">
            {step > 0 && (
              <button className="onboarding-back-btn" onClick={() => setStep(step - 1)}>
                {t('onboarding.back')}
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button className="onboarding-next-btn" onClick={() => setStep(step + 1)}>
                {t('onboarding.next')}
              </button>
            ) : (
              <button className="onboarding-next-btn" onClick={finish}>
                {t('onboarding.start.done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
