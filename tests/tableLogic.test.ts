import { describe, it, expect } from 'vitest';
import {
  filterRows,
  sortRows,
  getNextSortState,
  normalizeSearchString,
} from '../src/logic/tableLogic';
import type { TableRow, NormalizedColumn, FilterState } from '../src/types/table';

describe('normalizeSearchString', () => {
  it('normalizes diacritics, casing and Polish "ł"', () => {
    expect(normalizeSearchString('Anna Woźniak')).toBe('anna wozniak');
    expect(normalizeSearchString('Łukasz Żółć')).toBe('lukasz zolc');
    expect(normalizeSearchString(null)).toBe('');
    expect(normalizeSearchString(undefined)).toBe('');
  });
});

describe('filterRows', () => {
  const testColumns: NormalizedColumn[] = [
    {
      key: 'loanId',
      label: 'ID wniosku',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 0,
      sourceIndex: 0,
    },
    {
      key: 'customerName',
      label: 'Klient',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 1,
      sourceIndex: 1,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      sortable: true,
      filterable: true,
      visible: true,
      order: 2,
      sourceIndex: 2,
      options: ['new', 'in_review', 'approved', 'rejected'],
    },
    {
      key: 'market',
      label: 'Rynek',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 3,
      sourceIndex: 3,
    },
    {
      key: 'monthlyRate',
      label: 'Rata',
      type: 'currency',
      sortable: true,
      filterable: false,
      visible: true,
      order: 4,
      sourceIndex: 4,
    },
  ];

  const testRows: TableRow[] = [
    {
      id: 'LN-01',
      sourceIndex: 0,
      values: {
        loanId: 'LN-01',
        customerName: 'Anna Woźniak',
        status: 'approved',
        market: 'CZ',
        monthlyRate: 1400,
      },
    },
    {
      id: 'LN-02',
      sourceIndex: 1,
      values: {
        loanId: 'LN-02',
        customerName: 'Marcin Zielińska',
        status: 'new',
        market: 'PL',
        monthlyRate: 2800,
      },
    },
    {
      id: 'LN-03',
      sourceIndex: 2,
      values: {
        loanId: 'LN-03',
        customerName: 'Piotr Wójcik',
        status: 'approved',
        market: 'DE',
        monthlyRate: 1950,
      },
    },
  ];

  it('filters by status with exact match', () => {
    const filter: FilterState = { query: '', selections: { status: 'new' } };
    const result = filterRows(testRows, testColumns, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('LN-02');
  });

  it('filters by case- and diacritic-insensitive query across text fields', () => {
    const filter1: FilterState = { query: 'wozniak', selections: {} };
    const result1 = filterRows(testRows, testColumns, filter1);
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe('LN-01');

    const filter2: FilterState = { query: 'de', selections: {} };
    const result2 = filterRows(testRows, testColumns, filter2);
    expect(result2).toHaveLength(1);
    expect(result2[0].id).toBe('LN-03');

    const filter3: FilterState = { query: 'ln-02', selections: {} };
    const result3 = filterRows(testRows, testColumns, filter3);
    expect(result3).toHaveLength(1);
    expect(result3[0].id).toBe('LN-02');
  });

  it('combines text query and status filter with AND logic', () => {
    const filter: FilterState = { query: 'wo', selections: { status: 'approved' } };
    const result = filterRows(testRows, testColumns, filter);
    expect(result).toHaveLength(2);

    const filterMismatch: FilterState = { query: 'wozniak', selections: { status: 'new' } };
    const mismatchResult = filterRows(testRows, testColumns, filterMismatch);
    expect(mismatchResult).toHaveLength(0);
  });

  it('returns all rows when filter is empty', () => {
    const filter: FilterState = { query: '  ', selections: { status: '' } };
    const result = filterRows(testRows, testColumns, filter);
    expect(result).toHaveLength(3);
  });
});

describe('sortRows', () => {
  const columns: NormalizedColumn[] = [
    {
      key: 'name',
      label: 'Nazwa',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 0,
      sourceIndex: 0,
    },
    {
      key: 'amount',
      label: 'Kwota',
      type: 'currency',
      sortable: true,
      filterable: false,
      visible: true,
      order: 1,
      sourceIndex: 1,
    },
    {
      key: 'updatedAt',
      label: 'Data',
      type: 'date',
      sortable: true,
      filterable: false,
      visible: true,
      order: 2,
      sourceIndex: 2,
    },
  ];

  const rowsWithMissing: TableRow[] = [
    { id: '1', sourceIndex: 0, values: { name: 'Łukasz', amount: 500, updatedAt: '2026-02-01T10:00:00Z' } },
    { id: '2', sourceIndex: 1, values: { name: null, amount: null, updatedAt: null } },
    { id: '3', sourceIndex: 2, values: { name: 'Adam', amount: 1200, updatedAt: '2026-01-01T10:00:00Z' } },
    { id: '4', sourceIndex: 3, values: { name: 'Bartosz', amount: 100, updatedAt: '2026-03-01T10:00:00Z' } },
    { id: '5', sourceIndex: 4, values: { name: '', amount: NaN, updatedAt: 'invalid-date' } },
  ];

  it('sorts numbers/currency properly (finite numeric value)', () => {
    const asc = sortRows(rowsWithMissing, columns, { key: 'amount', direction: 'asc' });
    expect(asc.map((r) => r.id)).toEqual(['4', '1', '3', '2', '5']);

    const desc = sortRows(rowsWithMissing, columns, { key: 'amount', direction: 'desc' });
    expect(desc.map((r) => r.id)).toEqual(['3', '1', '4', '2', '5']);
  });

  it('sorts dates by epoch timestamp, with missing dates always last', () => {
    const asc = sortRows(rowsWithMissing, columns, { key: 'updatedAt', direction: 'asc' });
    expect(asc.map((r) => r.id)).toEqual(['3', '1', '4', '2', '5']);

    const desc = sortRows(rowsWithMissing, columns, { key: 'updatedAt', direction: 'desc' });
    expect(desc.map((r) => r.id)).toEqual(['4', '1', '3', '2', '5']);
  });

  it('sorts text with Polish collation, with missing strings always last', () => {
    const asc = sortRows(rowsWithMissing, columns, { key: 'name', direction: 'asc' });
    expect(asc.map((r) => r.id)).toEqual(['3', '4', '1', '2', '5']);

    const desc = sortRows(rowsWithMissing, columns, { key: 'name', direction: 'desc' });
    expect(desc.map((r) => r.id)).toEqual(['1', '4', '3', '2', '5']);
  });

  it('does not mutate the source array', () => {
    const originalOrder = rowsWithMissing.map((r) => r.id);
    sortRows(rowsWithMissing, columns, { key: 'amount', direction: 'asc' });
    expect(rowsWithMissing.map((r) => r.id)).toEqual(originalOrder);
  });

  it('cycles sort state correctly: unsorted -> asc -> desc -> unsorted', () => {
    const step1 = getNextSortState(null, 'amount');
    expect(step1).toEqual({ key: 'amount', direction: 'asc' });

    const step2 = getNextSortState(step1, 'amount');
    expect(step2).toEqual({ key: 'amount', direction: 'desc' });

    const step3 = getNextSortState(step2, 'amount');
    expect(step3).toBeNull();

    const stepSwitch = getNextSortState(step2, 'name');
    expect(stepSwitch).toEqual({ key: 'name', direction: 'asc' });
  });

  it('maintains stable sort order (sourceIndex) for identical values', () => {
    const identicalRows: TableRow[] = [
      { id: 'first', sourceIndex: 0, values: { name: 'Adam', amount: 100 } },
      { id: 'second', sourceIndex: 1, values: { name: 'Adam', amount: 100 } },
      { id: 'third', sourceIndex: 2, values: { name: 'Adam', amount: 100 } },
    ];
    const sorted = sortRows(identicalRows, columns, { key: 'amount', direction: 'asc' });
    expect(sorted.map((r) => r.id)).toEqual(['first', 'second', 'third']);
  });

  it('handles negative, zero and fractional numbers correctly in currency sorting', () => {
    const numericRows: TableRow[] = [
      { id: 'zero', sourceIndex: 0, values: { amount: 0 } },
      { id: 'negative', sourceIndex: 1, values: { amount: -250.5 } },
      { id: 'positiveSmall', sourceIndex: 2, values: { amount: 12.34 } },
      { id: 'positiveLarge', sourceIndex: 3, values: { amount: 9999.99 } },
    ];
    const asc = sortRows(numericRows, columns, { key: 'amount', direction: 'asc' });
    expect(asc.map((r) => r.id)).toEqual(['negative', 'zero', 'positiveSmall', 'positiveLarge']);

    const desc = sortRows(numericRows, columns, { key: 'amount', direction: 'desc' });
    expect(desc.map((r) => r.id)).toEqual(['positiveLarge', 'positiveSmall', 'zero', 'negative']);
  });
});

describe('Pipeline integrity: source rows -> filter -> sort -> paginate', () => {
  const columns: NormalizedColumn[] = [
    {
      key: 'customer',
      label: 'Klient',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 0,
      sourceIndex: 0,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      sortable: true,
      filterable: true,
      visible: true,
      order: 1,
      sourceIndex: 1,
      options: ['active', 'inactive'],
    },
  ];

  const sourceRows: TableRow[] = [
    { id: 'row-1', sourceIndex: 0, values: { customer: 'Zygmunt', status: 'active' } },
    { id: 'row-2', sourceIndex: 1, values: { customer: 'Bogdan', status: 'inactive' } },
    { id: 'row-3', sourceIndex: 2, values: { customer: 'Adam', status: 'active' } },
    { id: 'row-4', sourceIndex: 3, values: { customer: 'Cezary', status: 'active' } },
    { id: 'row-5', sourceIndex: 4, values: { customer: 'Dariusz', status: 'active' } },
  ];

  it('proves that filter -> sort -> paginate yields correct globally-ranked page items', () => {
    const filtered = filterRows(sourceRows, columns, { query: '', selections: { status: 'active' } });
    expect(filtered.map((r) => r.id)).toEqual(['row-1', 'row-3', 'row-4', 'row-5']);

    const sorted = sortRows(filtered, columns, { key: 'customer', direction: 'asc' });
    expect(sorted.map((r) => r.id)).toEqual(['row-3', 'row-4', 'row-5', 'row-1']);

    const page1 = sorted.slice(0, 2);
    expect(page1.map((r) => r.id)).toEqual(['row-3', 'row-4']);

    const page2 = sorted.slice(2, 4);
    expect(page2.map((r) => r.id)).toEqual(['row-5', 'row-1']);

    const wrongPage1 = sourceRows.slice(0, 2);
    expect(wrongPage1.some((r) => r.id === 'row-3')).toBe(false);
  });
});
