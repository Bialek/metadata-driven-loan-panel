import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LoadState, TableRow } from './types/table';
import { fetchTableData } from './services/tableRepository';
import { normalizeColumns, normalizeRows } from './services/tableAdapter';
import { DataTable } from './components/DataTable/DataTable';
import { LoadingState } from './components/Feedback/LoadingState';
import { ErrorState } from './components/Feedback/ErrorState';
import { EmptyState } from './components/Feedback/EmptyState';
import styles from './App.module.css';

export const App: React.FC = () => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [actionNotification, setActionNotification] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadState({ status: 'loading' });
    try {
      const data = await fetchTableData({ signal: controller.signal });
      const columns = normalizeColumns(data.columns);
      const rows = normalizeRows(data.rows);

      setLoadState({
        status: 'success',
        columns,
        rows,
      });
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
      setLoadState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadData]);

  useEffect(() => {
    if (!actionNotification) {
      return;
    }
    const timer = setTimeout(() => {
      setActionNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [actionNotification]);

  const handleAction = useCallback((actionId: string, row: TableRow) => {
    const customer = row.values.customerName ? String(row.values.customerName) : '';
    const message = `Wywołano akcję "${actionId}" dla wniosku ${row.id}${customer ? ` (${customer})` : ''}.`;
    setActionNotification(message);
  }, []);

  return (
    <div className={styles.appLayout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.titleGroup}>
            <svg
              className={styles.logoIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <h1 className={styles.appTitle}>Panel wniosków pożyczkowych</h1>
          </div>
          <span className={styles.badgeMetadata}>Tabela sterowana metadanymi</span>
        </div>
      </header>

      <main className={styles.mainContent}>
        {actionNotification && (
          <div className={styles.toastAlert} role="status">
            <span>{actionNotification}</span>
            <button
              type="button"
              className={styles.toastCloseBtn}
              onClick={() => setActionNotification(null)}
              aria-label="Zamknij powiadomienie"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {loadState.status === 'loading' && <LoadingState />}

        {loadState.status === 'error' && (
          <ErrorState message={loadState.message} onRetry={loadData} />
        )}

        {loadState.status === 'success' && (
          <>
            {loadState.rows.length === 0 ? (
              <EmptyState
                title="Brak wniosków w systemie"
                description="Baza danych nie zawiera obecnie żadnych zarejestrowanych wniosków pożyczkowych."
              />
            ) : (
              <DataTable
                columns={loadState.columns}
                rows={loadState.rows}
                onAction={handleAction}
              />
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        System zarządzania wnioskami pożyczkowymi &bull; Architektura sterowana metadanymi (React + TypeScript)
      </footer>
    </div>
  );
};
