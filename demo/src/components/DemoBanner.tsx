import { useTranslation } from 'react-i18next';

export function DemoBanner() {
  const { t } = useTranslation();
  return <div className="demo-banner">{t('demo.simulatedBanner')}</div>;
}
