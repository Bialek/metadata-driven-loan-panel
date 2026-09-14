export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'badge'
  | 'action';

export interface RawColumn {
  key: string;
  label: string;
  type: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  order?: number;
  options?: readonly string[];
  action?: string;
  currency?: string;
}

export interface NormalizedColumn extends RawColumn {
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  order: number;
  sourceIndex: number;
}

export interface LoanRowDto {
  loanId?: string | null;
  customerName?: string | null;
  status?: string | null;
  market?: string | null;
  monthlyRate?: number | null;
  updatedAt?: string | null;
  permissions?: {
    canEdit?: boolean | null;
  } | null;
}

export type CellValue = string | number | boolean | null | undefined;

export interface TableRow {
  id: string;
  sourceIndex: number;
  values: Record<string, CellValue>;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface FilterState {
  query: string;
  selections: Record<string, string>;
}

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      columns: NormalizedColumn[];
      rows: TableRow[];
    };
