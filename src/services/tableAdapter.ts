import type {
  RawColumn,
  NormalizedColumn,
  LoanRowDto,
  TableRow,
  ColumnType,
  CellValue,
} from '../types/table';

const VALID_COLUMN_TYPES = new Set<ColumnType>([
  'text',
  'number',
  'currency',
  'date',
  'badge',
  'action',
]);

export function normalizeColumns(rawColumns: unknown[]): NormalizedColumn[] {
  if (!Array.isArray(rawColumns) || rawColumns.length === 0) {
    throw new Error('Metadane kolumn nie mogą być pustą tablicą');
  }

  const normalized = rawColumns.map((col, sourceIndex) => {
    if (!col || typeof col !== 'object') {
      throw new Error(
        `Kolumna na pozycji ${sourceIndex} nie jest poprawnym obiektem metadanych`
      );
    }

    const candidate = col as Partial<RawColumn>;

    if (!candidate.key || typeof candidate.key !== 'string' || candidate.key.trim() === '') {
      throw new Error(`Kolumna na pozycji ${sourceIndex} nie posiada wymaganego klucza "key"`);
    }

    if (!candidate.label || typeof candidate.label !== 'string') {
      throw new Error(`Kolumna "${candidate.key}" nie posiada wymaganej etykiety "label"`);
    }

    if (!candidate.type || !VALID_COLUMN_TYPES.has(candidate.type)) {
      throw new Error(
        `Kolumna "${candidate.key}" posiada nieobsługiwany typ "${candidate.type}"`
      );
    }

    const visible = candidate.visible !== false;
    const sortable = Boolean(candidate.sortable);
    const filterable = Boolean(candidate.filterable);
    const order = typeof candidate.order === 'number' && Number.isFinite(candidate.order)
      ? candidate.order
      : sourceIndex;

    const normalizedCol: NormalizedColumn = {
      ...candidate,
      key: candidate.key.trim(),
      label: candidate.label.trim(),
      type: candidate.type,
      visible,
      sortable,
      filterable,
      order,
      sourceIndex,
      options: Array.isArray(candidate.options) ? candidate.options : undefined,
    };

    return normalizedCol;
  });

  return normalized.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.sourceIndex - b.sourceIndex;
  });
}

export function normalizeRows(rawRows: unknown[]): TableRow[] {
  if (!Array.isArray(rawRows)) {
    return [];
  }

  const seenIds = new Map<string, number>();

  return rawRows.map((raw, sourceIndex) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as LoanRowDto;

    let rawId = typeof row.loanId === 'string' && row.loanId.trim() !== ''
      ? row.loanId.trim()
      : `row-${sourceIndex + 1}`;

    const occurrence = seenIds.get(rawId) || 0;
    seenIds.set(rawId, occurrence + 1);
    if (occurrence > 0) {
      rawId = `${rawId}-${occurrence}`;
    }

    const canEdit = row.permissions?.canEdit === true;

    const values: Record<string, CellValue> = {
      loanId: typeof row.loanId === 'string' ? row.loanId : null,
      customerName: typeof row.customerName === 'string' ? row.customerName : null,
      status: typeof row.status === 'string' ? row.status : null,
      market: typeof row.market === 'string' ? row.market : null,
      monthlyRate: typeof row.monthlyRate === 'number' && Number.isFinite(row.monthlyRate)
        ? row.monthlyRate
        : null,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
      canEdit,
    };

    const rawRecord = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawRecord)) {
      if (k === 'permissions' || k in values) {
        continue;
      }
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        values[k] = v;
      }
    }

    return {
      id: rawId,
      sourceIndex,
      values,
    };
  });
}
