import { describe, it, expect } from 'vitest';
import { normalizeColumns, normalizeRows } from '../src/services/tableAdapter';

describe('normalizeColumns', () => {
  it('respects visibility and ordering rules', () => {
    const raw = [
      { key: 'colA', label: 'Kolumna A', type: 'text', order: 20 },
      { key: 'colB', label: 'Kolumna B', type: 'text', visible: false },
      { key: 'colC', label: 'Kolumna C', type: 'number', order: 5 },
      { key: 'colD', label: 'Kolumna D', type: 'currency' },
    ];

    const normalized = normalizeColumns(raw);

    expect(normalized.map((c) => c.key)).toEqual(['colB', 'colD', 'colC', 'colA']);
    expect(normalized.find((c) => c.key === 'colB')?.visible).toBe(false);
    expect(normalized.find((c) => c.key === 'colA')?.visible).toBe(true);
  });

  it('throws on invalid column metadata', () => {
    expect(() => normalizeColumns([])).toThrow();
    expect(() => normalizeColumns([{ key: 'a' }])).toThrow();
    expect(() => normalizeColumns([{ key: 'a', label: 'A', type: 'invalidType' }])).toThrow();
  });
});

describe('normalizeRows', () => {
  it('normalizes permissions.canEdit to values.canEdit with fail-closed behavior', () => {
    const raw = [
      {
        loanId: 'LN-1',
        customerName: 'Jan Kowalski',
        permissions: { canEdit: true },
      },
      {
        loanId: 'LN-2',
        customerName: 'Anna Nowak',
        permissions: { canEdit: false },
      },
      {
        loanId: 'LN-3',
        customerName: 'Ewa Wiśniewska',
        permissions: null,
      },
      {
        loanId: 'LN-4',
        customerName: 'Piotr Zieliński',
      },
      {
        loanId: 'LN-5',
        customerName: 'Ola Pawlak',
        permissions: { canEdit: 'false' },
      },
    ];

    const normalized = normalizeRows(raw);

    expect(normalized[0].values.canEdit).toBe(true);
    expect(normalized[1].values.canEdit).toBe(false);
    expect(normalized[2].values.canEdit).toBe(false);
    expect(normalized[3].values.canEdit).toBe(false);
    expect(normalized[4].values.canEdit).toBe(false);
  });

  it('handles duplicate IDs and missing IDs deterministically', () => {
    const raw = [
      { loanId: 'DUPLICATE', customerName: 'A' },
      { loanId: 'DUPLICATE', customerName: 'B' },
      { loanId: '', customerName: 'C' },
      { customerName: 'D' },
    ];

    const normalized = normalizeRows(raw);

    expect(normalized[0].id).toBe('DUPLICATE');
    expect(normalized[1].id).toBe('DUPLICATE-1');
    expect(normalized[2].id).toBe('row-3');
    expect(normalized[3].id).toBe('row-4');
  });
});
