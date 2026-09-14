import React from 'react';
import type { NormalizedColumn, FilterState } from '../../types/table';
import { formatStatus, formatNumber } from '../../logic/formatters';
import styles from './TableToolbar.module.css';

interface TableToolbarProps {
  columns: readonly NormalizedColumn[];
  filterState: FilterState;
  isFiltered: boolean;
  onFilterChange: (next: FilterState, isDiscrete?: boolean) => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  columns,
  filterState,
  isFiltered,
  onFilterChange,
  totalCount,
  filteredCount,
  onResetFilters,
}) => {
  const statusColumn = columns.find(
    (col) => col.type === 'badge' && col.filterable && (col.options?.length ?? 0) > 0
  );
  const statusOptions = statusColumn?.options || [];

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(
      {
        ...filterState,
        query: e.target.value,
      },
      false
    );
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!statusColumn) {
      return;
    }
    const selected = e.target.value;
    onFilterChange(
      {
        ...filterState,
        selections: {
          ...filterState.selections,
          [statusColumn.key]: selected === 'all' ? '' : selected,
        },
      },
      true
    );
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onFilterChange(filterState, true);
    }
  };

  const handleQueryBlur = () => {
    if (filterState.query) {
      onFilterChange(filterState, true);
    }
  };

  return (
    <section className={styles.toolbar} aria-label="Narzędzia wyszukiwania i filtrowania">
      <div className={styles.controlsGroup}>
        <div className={styles.searchWrapper}>
          <label htmlFor="table-search-input" className={styles.visuallyHidden}>
            Szukaj wniosku
          </label>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            id="table-search-input"
            type="search"
            className={styles.searchInput}
            placeholder="Szukaj wniosków…"
            value={filterState.query}
            onChange={handleQueryChange}
            onKeyDown={handleQueryKeyDown}
            onBlur={handleQueryBlur}
            autoComplete="off"
            spellCheck="false"
          />
          {filterState.query && (
            <button
              type="button"
              className={styles.clearInputBtn}
              onClick={() => onFilterChange({ ...filterState, query: '' }, true)}
              aria-label="Wyczyść pole wyszukiwania"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>

        {statusColumn && statusOptions.length > 0 && (
          <div className={styles.selectWrapper}>
            <label htmlFor="status-filter-select" className={styles.filterLabel}>
              Status:
            </label>
            <select
              id="status-filter-select"
              className={styles.selectInput}
              value={filterState.selections[statusColumn.key] || 'all'}
              onChange={handleStatusChange}
              aria-label="Filtruj według statusu"
            >
              <option value="all">Wszystkie statusy</option>
              {statusOptions.map((opt) => {
                const meta = formatStatus(opt);
                return (
                  <option key={opt} value={opt}>
                    {meta?.label || opt}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {isFiltered && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={onResetFilters}
            aria-label="Wyczyść wszystkie filtry"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className={styles.statsBadge} role="status" aria-live="polite">
        Wyświetlono:{' '}
        <strong>
          {formatNumber(filteredCount)} z {formatNumber(totalCount)}
        </strong>{' '}
        wniosków
      </div>
    </section>
  );
};
