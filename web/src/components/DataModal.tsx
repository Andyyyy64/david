import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

interface DataStats {
  counts: Record<string, number>;
  firstDate: string;
  lastDate: string;
  dbSizeBytes: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

const EXPORT_TABLES = [
  'frames',
  'summaries',
  'events',
  'chat_messages',
  'memos',
  'reports',
  'activity_mappings',
];

const IMPORT_TABLES = [
  'frames',
  'summaries',
  'events',
  'chat_messages',
  'memos',
  'reports',
];

interface Props {
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateShort(ts: string): string {
  if (!ts) return '—';
  return ts.slice(0, 10);
}

export function DataModal({ onClose }: Props) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [importTable, setImportTable] = useState('frames');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (api.data.stats() as Promise<DataStats>)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  async function handleExport(table: string, format: 'csv' | 'json' = 'csv') {
    const content = await api.data.exportTable(table, format);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table}-all.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportAll(format: 'csv' | 'json') {
    EXPORT_TABLES.forEach((table, i) => {
      setTimeout(() => handleExport(table, format), i * 300);
    });
  }

  async function handleImport() {
    setImportError('CSV import is not yet supported in Tauri mode.');
  }

  // Primary stat tables shown with counts
  const statEntries = stats
    ? Object.entries(stats.counts).filter(([, v]) => v > 0 || true)
    : [];

  const totalRecords = stats
    ? Object.values(stats.counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div
      className="data-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('data.title')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="data-modal">
        <div className="data-header">
          <span className="data-title">{t('data.title')}</span>
          <button className="data-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {loading ? (
          <div className="data-loading">{t('common.loading')}</div>
        ) : stats ? (
          <div className="data-body">
            {/* ── Overview ── */}
            <section className="data-section">
              <h3 className="data-section-title">{t('data.overview')}</h3>
              <div className="data-overview-row">
                <span className="data-overview-label">{t('data.dbSize')}</span>
                <span className="data-overview-value">{formatBytes(stats.dbSizeBytes)}</span>
              </div>
              <div className="data-overview-row">
                <span className="data-overview-label">{t('data.dateRange')}</span>
                <span className="data-overview-value">
                  {formatDateShort(stats.firstDate)} — {formatDateShort(stats.lastDate)}
                </span>
              </div>
              <div className="data-overview-row">
                <span className="data-overview-label">{t('data.totalRecords')}</span>
                <span className="data-overview-value">{totalRecords.toLocaleString()}</span>
              </div>
            </section>

            {/* ── Table Counts ── */}
            <section className="data-section">
              <h3 className="data-section-title">{t('data.tables')}</h3>
              <div className="data-table-grid">
                {statEntries.map(([table, count]) => (
                  <div className="data-table-row" key={table}>
                    <span className="data-table-name">{t(`data.table_${table}`)}</span>
                    <span className="data-table-count">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Export ── */}
            <section className="data-section">
              <h3 className="data-section-title">{t('data.export')}</h3>
              <p className="data-hint">{t('data.exportHint')}</p>
              <div className="data-export-grid">
                <div className="data-export-row data-export-row--all">
                  <span className="data-export-name">{t('data.all')}</span>
                  <div className="data-export-actions">
                    <button
                      className="data-btn data-btn--sm data-btn--primary"
                      onClick={() => handleExportAll('csv')}
                    >
                      CSV
                    </button>
                    <button
                      className="data-btn data-btn--sm data-btn--primary"
                      onClick={() => handleExportAll('json')}
                    >
                      JSON
                    </button>
                  </div>
                </div>
                {EXPORT_TABLES.map((table) => (
                  <div className="data-export-row" key={table}>
                    <span className="data-export-name">{t(`data.table_${table}`)}</span>
                    <div className="data-export-actions">
                      <button
                        className="data-btn data-btn--sm"
                        onClick={() => handleExport(table, 'csv')}
                      >
                        CSV
                      </button>
                      <button
                        className="data-btn data-btn--sm"
                        onClick={() => handleExport(table, 'json')}
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Import ── */}
            <section className="data-section">
              <h3 className="data-section-title">{t('data.import')}</h3>
              <p className="data-hint">{t('data.importHint')}</p>
              <div className="data-import-form">
                <select
                  className="data-import-select"
                  value={importTable}
                  onChange={(e) => setImportTable(e.target.value)}
                >
                  <option value="all">{t('data.all')}</option>
                  {IMPORT_TABLES.map((table) => (
                    <option key={table} value={table}>
                      {t(`data.table_${table}`)}
                    </option>
                  ))}
                </select>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  multiple={importTable === 'all'}
                  className="data-import-file"
                />
                <button
                  className="data-btn data-btn--primary"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? t('data.importing') : t('data.importCsv')}
                </button>
              </div>
              {importResult && (
                <div className="data-import-result data-import-result--success">
                  {t('data.importSuccess', {
                    imported: importResult.imported,
                    skipped: importResult.skipped,
                  })}
                </div>
              )}
              {importError && (
                <div className="data-import-result data-import-result--error">
                  {importError}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="data-loading">{t('errors.network')}</div>
        )}

        <div className="data-footer">
          <button className="data-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
