import React, { useState, useMemo, useCallback } from 'react';
import type {
  NormalizedColumn,
  TableRow,
  SortState,
  FilterState,
} from '../../types/table';
import { filterRows, sortRows, getNextSortState } from '../../logic/tableLogic';
import {
  readTableStateFromUrl,
  writeTableStateToUrl,
  useTableUrlSync,
  type UrlTableState,
} from '../../hooks/useTableUrlSync';
import { TableHeader } from './TableHeader';
import { TableCell } from './TableCell';
import { TableToolbar } from './TableToolbar';
import { EmptyState } from '../Feedback/EmptyState';
import styles from './DataTable.module.css';

export interface DataTableProps {
  columns: readonly NormalizedColumn[];
  rows: readonly TableRow[];
  onAction?: (actionId: string, row: TableRow) => void;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;

const INITIAL_FILTER_STATE: FilterState = {
  query: '',
  selections: {},
};

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  onAction,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  const visibleColumns = useMemo(() => {
    return [...columns]
      .filter((col) => col.visible)
      .sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.sourceIndex - b.sourceIndex;
      });
  }, [columns]);

  const statusColumn = useMemo(
    () => visibleColumns.find(
      (col) => col.type === 'badge' && col.filterable && (col.options?.length ?? 0) > 0
    ),
    [visibleColumns]
  );

  const initialUrlState = useMemo(() => readTableStateFromUrl(), []);
  const initialSortState = initialUrlState.sort
    && visibleColumns.some(
      (column) => column.key === initialUrlState.sort?.key && column.sortable
    )
    ? initialUrlState.sort
    : null;
  const initialStatus = statusColumn?.options?.includes(initialUrlState.status)
    ? initialUrlState.status
    : '';

  const [sortState, setSortState] = useState<SortState | null>(() => initialSortState);
  const [filterState, setFilterState] = useState<FilterState>(() => {
    const selections: Record<string, string> = statusColumn && initialStatus
      ? { [statusColumn.key]: initialStatus }
      : {};
    return {
      query: initialUrlState.query,
      selections,
    };
  });
  const [currentPage, setCurrentPage] = useState<number>(() => initialUrlState.page);

  const handleSyncFromUrl = useCallback((urlState: UrlTableState) => {
    const validStatus = statusColumn?.options?.includes(urlState.status)
      ? urlState.status
      : '';
    const selections: Record<string, string> = statusColumn && validStatus
      ? { [statusColumn.key]: validStatus }
      : {};
    setFilterState({
      query: urlState.query,
      selections,
    });
    setSortState(
      urlState.sort
        && visibleColumns.some(
          (column) => column.key === urlState.sort?.key && column.sortable
        )
        ? urlState.sort
        : null
    );
    setCurrentPage(urlState.page);
  }, [statusColumn, visibleColumns]);

  const filteredRows = useMemo(() => {
    return filterRows(rows, visibleColumns, filterState);
  }, [rows, visibleColumns, filterState]);

  const sortedRows = useMemo(() => {
    return sortRows(filteredRows, visibleColumns, sortState);
  }, [filteredRows, visibleColumns, sortState]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  useTableUrlSync({
    filterState,
    sortState,
    currentPage: safeCurrentPage,
    onSyncFromUrl: handleSyncFromUrl,
    statusKey: statusColumn?.key,
  });

  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, safeCurrentPage, pageSize]);

  const handleSort = useCallback(
    (columnKey: string) => {
      const nextSort = getNextSortState(sortState, columnKey);
      setSortState(nextSort);
      writeTableStateToUrl(
        {
          query: filterState.query,
          status: statusColumn ? filterState.selections[statusColumn.key] : undefined,
          sort: nextSort,
          page: safeCurrentPage,
        },
        'push'
      );
    },
    [sortState, filterState, safeCurrentPage, statusColumn]
  );

  const handlePageChange = useCallback(
    (targetPage: number) => {
      const nextPage = Math.min(totalPages, Math.max(1, targetPage));
      setCurrentPage(nextPage);
      writeTableStateToUrl(
        {
          query: filterState.query,
          status: statusColumn ? filterState.selections[statusColumn.key] : undefined,
          sort: sortState,
          page: nextPage,
        },
        'push'
      );
    },
    [totalPages, filterState, sortState, statusColumn]
  );

  const handleFilterChange = useCallback(
    (next: FilterState, isDiscrete = false) => {
      setFilterState(next);
      setCurrentPage(1);
      writeTableStateToUrl(
        {
          query: next.query,
          status: statusColumn ? next.selections[statusColumn.key] : undefined,
          sort: sortState,
          page: 1,
        },
        isDiscrete ? 'push' : 'replace'
      );
    },
    [sortState, statusColumn]
  );

  const handleResetFilters = useCallback(() => {
    setFilterState(INITIAL_FILTER_STATE);
    setCurrentPage(1);
    writeTableStateToUrl(
      {
        query: '',
        status: '',
        sort: sortState,
        page: 1,
      },
      'push'
    );
  }, [sortState]);

  const isFiltered =
    filterState.query.trim() !== '' ||
    Object.values(filterState.selections).some(
      (val) => val && val.trim() !== '' && val !== 'all'
    );

  return (
    <div className={styles.tableContainer}>
      <TableToolbar
        columns={visibleColumns}
        filterState={filterState}
        isFiltered={isFiltered}
        onFilterChange={handleFilterChange}
        totalCount={rows.length}
        filteredCount={filteredRows.length}
        onResetFilters={handleResetFilters}
      />

      {filteredRows.length === 0 && rows.length > 0 ? (
        <EmptyState
          title="Brak wyników spełniających kryteria"
          description={
            isFiltered
              ? 'Spróbuj zmienić parametry wyszukiwania lub zresetuj aktywne filtry.'
              : undefined
          }
          actionLabel="Wyczyść filtry"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          <div className={styles.tableScrollArea} tabIndex={0} role="region" aria-label="Tabela wniosków">
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  {visibleColumns.map((col) => (
                    <TableHeader
                      key={col.key}
                      column={col}
                      sortState={sortState}
                      onSort={handleSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {paginatedRows.map((row) => (
                  <tr key={row.id}>
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={`${row.id}-${col.key}`}
                        column={col}
                        row={row}
                        onAction={onAction}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <nav className={styles.pagination} aria-label="Paginacja tabeli">
              <div className={styles.paginationInfo}>
                Strona <strong>{safeCurrentPage}</strong> z <strong>{totalPages}</strong>
                <span className={styles.paginationRange}>
                  ({(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, sortedRows.length)} z {sortedRows.length})
                </span>
              </div>
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.paginationBtn}
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  disabled={safeCurrentPage <= 1}
                  aria-label="Poprzednia strona"
                >
                  Poprzednia
                </button>
                <button
                  type="button"
                  className={styles.paginationBtn}
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  disabled={safeCurrentPage >= totalPages}
                  aria-label="Następna strona"
                >
                  Następna
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
};
