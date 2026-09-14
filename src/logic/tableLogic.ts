import type {
  TableRow,
  NormalizedColumn,
  SortState,
  FilterState,
} from '../types/table';

const polishCollator = new Intl.Collator('pl', {
  sensitivity: 'base',
  numeric: true,
});

export function normalizeSearchString(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val)
    .trim()
    .replace(/[łŁ]/g, 'l')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseDateEpoch(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const time = new Date(String(value)).getTime();
  return Number.isNaN(time) ? null : time;
}

export function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function isColumnValueMissing(value: unknown, type: NormalizedColumn['type']): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (type === 'date') {
    return parseDateEpoch(value) === null;
  }
  if (type === 'number' || type === 'currency') {
    return parseNumeric(value) === null;
  }
  return String(value).trim() === '';
}

export function filterRows(
  rows: readonly TableRow[],
  columns: readonly NormalizedColumn[],
  filterState: FilterState
): TableRow[] {
  const normalizedQuery = normalizeSearchString(filterState.query);
  const activeSelections = Object.entries(filterState.selections).filter(
    ([, val]) => val && val.trim() !== '' && val !== 'all'
  );

  const searchableColumns = columns.filter(
    (col) => col.visible && col.filterable && col.type === 'text'
  );

  return rows.filter((row) => {
    for (const [key, selectedVal] of activeSelections) {
      const cellVal = row.values[key];
      if (cellVal === null || cellVal === undefined) {
        return false;
      }
      if (String(cellVal) !== selectedVal) {
        return false;
      }
    }

    if (normalizedQuery !== '') {
      if (searchableColumns.length === 0) {
        return false;
      }
      const matchesAnyColumn = searchableColumns.some((col) => {
        const cellVal = row.values[col.key];
        if (cellVal === null || cellVal === undefined) {
          return false;
        }
        const normalizedCell = normalizeSearchString(cellVal);
        return normalizedCell.includes(normalizedQuery);
      });

      if (!matchesAnyColumn) {
        return false;
      }
    }

    return true;
  });
}

export function sortRows(
  rows: readonly TableRow[],
  columns: readonly NormalizedColumn[],
  sortState: SortState | null
): TableRow[] {
  if (!sortState) {
    return [...rows];
  }

  const column = columns.find((c) => c.key === sortState.key);
  if (!column || !column.sortable) {
    return [...rows];
  }

  const { direction, key } = sortState;
  const colType = column.type;

  return [...rows].sort((a, b) => {
    const valA = a.values[key];
    const valB = b.values[key];

    const isMissingA = isColumnValueMissing(valA, colType);
    const isMissingB = isColumnValueMissing(valB, colType);

    if (isMissingA && isMissingB) {
      return a.sourceIndex - b.sourceIndex;
    }
    if (isMissingA) {
      return 1;
    }
    if (isMissingB) {
      return -1;
    }

    let comparison = 0;

    switch (colType) {
      case 'date': {
        const timeA = parseDateEpoch(valA) ?? 0;
        const timeB = parseDateEpoch(valB) ?? 0;
        comparison = timeA - timeB;
        break;
      }
      case 'number':
      case 'currency': {
        const numA = parseNumeric(valA) ?? 0;
        const numB = parseNumeric(valB) ?? 0;
        comparison = numA - numB;
        break;
      }
      case 'text':
      case 'badge':
      default: {
        comparison = polishCollator.compare(String(valA), String(valB));
        break;
      }
    }

    if (comparison === 0) {
      return a.sourceIndex - b.sourceIndex;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

export function getNextSortState(
  current: SortState | null,
  targetKey: string
): SortState | null {
  if (!current || current.key !== targetKey) {
    return { key: targetKey, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { key: targetKey, direction: 'desc' };
  }
  return null;
}
