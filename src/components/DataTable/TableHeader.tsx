import React from 'react';
import type { NormalizedColumn, SortState, ColumnType } from '../../types/table';
import styles from './DataTable.module.css';

interface TableHeaderProps {
  column: NormalizedColumn;
  sortState: SortState | null;
  onSort: (columnKey: string) => void;
}

const COLUMN_TYPE_HEADER_CLASS: Partial<Record<ColumnType, string>> = {
  currency: styles.th_currency,
  number: styles.th_number,
  action: styles.th_action,
};

export const TableHeader: React.FC<TableHeaderProps> = ({
  column,
  sortState,
  onSort,
}) => {
  const isSorted = sortState?.key === column.key;
  const sortDirection = isSorted ? sortState.direction : null;
  const typeClass = COLUMN_TYPE_HEADER_CLASS[column.type] || '';

  if (!column.sortable) {
    return (
      <th scope="col" className={`${styles.th} ${typeClass}`}>
        <span className={styles.headerLabel}>{column.label}</span>
      </th>
    );
  }

  const ariaSort = !sortDirection
    ? 'none'
    : sortDirection === 'asc'
      ? 'ascending'
      : 'descending';

  const nextActionLabel = !sortDirection
    ? `Sortuj rosnąco po kolumnie ${column.label}`
    : sortDirection === 'asc'
      ? `Sortuj malejąco po kolumnie ${column.label}`
      : `Usuń sortowanie po kolumnie ${column.label}`;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`${styles.th} ${styles.thSortable} ${isSorted ? styles.thSorted : ''} ${typeClass}`}
    >
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => onSort(column.key)}
        aria-label={nextActionLabel}
      >
        <span className={styles.headerLabel}>{column.label}</span>
        <span className={styles.sortIconWrapper} aria-hidden="true">
          {sortDirection === 'asc' ? (
            <svg className={styles.sortIcon} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : sortDirection === 'desc' ? (
            <svg className={styles.sortIcon} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className={`${styles.sortIcon} ${styles.sortIconInactive}`} viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 12l5 5 5-5H5zm10-4L10 3 5 8h10z" />
            </svg>
          )}
        </span>
      </button>
    </th>
  );
};
