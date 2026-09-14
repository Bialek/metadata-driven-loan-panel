import type { RawColumn, LoanRowDto } from '../types/table';

export interface FetchTableDataResult {
  columns: RawColumn[];
  rows: LoanRowDto[];
}

export interface FetchOptions {
  columnsUrl?: string;
  rowsUrl?: string;
  signal?: AbortSignal;
}

export async function fetchTableData(
  options: FetchOptions = {}
): Promise<FetchTableDataResult> {
  const {
    columnsUrl = '/data/columns.json',
    rowsUrl = '/data/rows.json',
    signal,
  } = options;

  const [columnsResponse, rowsResponse] = await Promise.all([
    fetch(columnsUrl, { signal }),
    fetch(rowsUrl, { signal }),
  ]);

  if (!columnsResponse.ok) {
    throw new Error(
      `Nie udało się pobrać metadanych kolumn (${columnsResponse.status} ${columnsResponse.statusText})`
    );
  }

  if (!rowsResponse.ok) {
    throw new Error(
      `Nie udało się pobrać danych wierszy (${rowsResponse.status} ${rowsResponse.statusText})`
    );
  }

  const columnsData: unknown = await columnsResponse.json();
  const rowsData: unknown = await rowsResponse.json();

  if (!Array.isArray(columnsData)) {
    throw new Error('Metadane kolumn muszą być poprawną tablicą JSON');
  }

  if (!Array.isArray(rowsData)) {
    throw new Error('Dane wierszy muszą być poprawną tablicą JSON');
  }

  return {
    columns: columnsData as RawColumn[],
    rows: rowsData as LoanRowDto[],
  };
}
