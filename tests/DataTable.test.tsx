import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../src/components/DataTable/DataTable';
import type { NormalizedColumn, TableRow } from '../src/types/table';

describe('DataTable metadata-driven rendering', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  const mockColumns: NormalizedColumn[] = [
    {
      key: 'colHidden',
      label: 'Niewidoczna kolumna',
      type: 'text',
      sortable: false,
      filterable: false,
      visible: false,
      order: 1,
      sourceIndex: 0,
    },
    {
      key: 'orderSecond',
      label: 'Druga kolumna',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 20,
      sourceIndex: 1,
    },
    {
      key: 'orderFirst',
      label: 'Pierwsza kolumna',
      type: 'text',
      sortable: true,
      filterable: true,
      visible: true,
      order: 10,
      sourceIndex: 2,
    },
    {
      key: 'canEdit',
      label: 'Akcje',
      type: 'action',
      action: 'edit',
      sortable: false,
      filterable: false,
      visible: true,
      order: 30,
      sourceIndex: 3,
    },
  ];

  const mockRows: TableRow[] = [
    {
      id: 'row-1',
      sourceIndex: 0,
      values: {
        colHidden: 'Ukryta wartość',
        orderFirst: 'Wartość 1A',
        orderSecond: 'Wartość 1B',
        canEdit: true,
      },
    },
    {
      id: 'row-2',
      sourceIndex: 1,
      values: {
        colHidden: 'Ukryta wartość 2',
        orderFirst: 'Wartość 2A',
        orderSecond: 'Wartość 2B',
        canEdit: false,
      },
    },
  ];

  it('hides columns with visible: false and respects explicit column order', () => {
    render(<DataTable columns={mockColumns} rows={mockRows} />);

    expect(screen.queryByText('Niewidoczna kolumna')).not.toBeInTheDocument();
    expect(screen.queryByText('Ukryta wartość')).not.toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent('Pierwsza kolumna');
    expect(headers[1]).toHaveTextContent('Druga kolumna');
    expect(headers[2]).toHaveTextContent('Akcje');
  });

  it('renders enabled/disabled action buttons and triggers callbacks accordingly', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(<DataTable columns={mockColumns} rows={mockRows} onAction={handleAction} />);

    const rows = screen.getAllByRole('row');
    const row1 = rows[1];
    const row2 = rows[2];

    const enabledBtn = within(row1).getByRole('button', { name: /edytuj/i });
    expect(enabledBtn).toBeEnabled();

    const disabledBtn = within(row2).getByRole('button', { name: /edytuj/i });
    expect(disabledBtn).toBeDisabled();

    await user.click(enabledBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleAction).toHaveBeenCalledWith('edit', mockRows[0]);

    await user.click(disabledBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('supports interactive sort cycling and updates aria-sort', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} rows={mockRows} />);

    const getTh = () => screen.getByRole('columnheader', { name: /Pierwsza kolumna/i });
    expect(getTh()).toHaveAttribute('aria-sort', 'none');

    await user.click(screen.getByRole('button', { name: /Sortuj rosnąco po kolumnie Pierwsza kolumna/i }));
    expect(getTh()).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /Sortuj malejąco po kolumnie Pierwsza kolumna/i }));
    expect(getTh()).toHaveAttribute('aria-sort', 'descending');

    await user.click(screen.getByRole('button', { name: /Usuń sortowanie po kolumnie Pierwsza kolumna/i }));
    expect(getTh()).toHaveAttribute('aria-sort', 'none');
  });

  it('filters rows interactively via search and shows filtered empty state when no match', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} rows={mockRows} />);

    const searchInput = screen.getByRole('searchbox', { name: 'Szukaj wniosku' });
    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.getByText('Wartość 2A')).toBeInTheDocument();

    await user.type(searchInput, '1A');
    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.queryByText('Wartość 2A')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'nonexistentxyz');
    expect(screen.getByText('Brak wyników spełniających kryteria')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: 'Wyczyść filtry' });
    await user.click(clearBtn);
    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.getByText('Wartość 2A')).toBeInTheDocument();
  });

  it('filtering is applied before pagination and changing filter resets page', async () => {
    const user = userEvent.setup();
    const manyRows: TableRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: `row-${i + 1}`,
      sourceIndex: i,
      values: {
        orderFirst: `Item ${i + 1}`,
        orderSecond: `Desc ${i + 1}`,
        canEdit: true,
      },
    }));

    render(<DataTable columns={mockColumns} rows={manyRows} pageSize={2} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: 'Poprzednia strona' });
    const nextBtn = screen.getByRole('button', { name: 'Następna strona' });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    await user.click(nextBtn);
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    expect(screen.getByText('Item 4')).toBeInTheDocument();
    expect(prevBtn).toBeEnabled();
    expect(window.location.search).toContain('page=2');

    const searchInput = screen.getByRole('searchbox', { name: 'Szukaj wniosku' });
    await user.type(searchInput, 'Item 5');

    expect(screen.getByText('Item 5')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Paginacja tabeli' })).toHaveTextContent(/Strona\s+1\s+z\s+1/i);
    expect(screen.getByRole('navigation', { name: 'Paginacja tabeli' })).toHaveTextContent(/1–1\s+z\s+1/);
    expect(window.location.search).toContain('q=Item+5');
  });

  it('initializes filter, sort, and page state directly from URL on mount', () => {
    window.history.replaceState(null, '', '/?q=1A&sort=orderFirst&dir=desc&page=1');

    render(<DataTable columns={mockColumns} rows={mockRows} />);

    const searchInput = screen.getByRole('searchbox', { name: 'Szukaj wniosku' }) as HTMLInputElement;
    expect(searchInput.value).toBe('1A');

    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.queryByText('Wartość 2A')).not.toBeInTheDocument();

    const header = screen.getByRole('columnheader', { name: /Pierwsza kolumna/i });
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('updates URL with sort parameters when sort header is clicked', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/');

    render(<DataTable columns={mockColumns} rows={mockRows} />);

    const sortBtn = screen.getByRole('button', { name: /Sortuj rosnąco po kolumnie Pierwsza kolumna/i });
    await user.click(sortBtn);

    expect(window.location.search).toBe('?sort=orderFirst&dir=asc');

    const sortDescBtn = screen.getByRole('button', { name: /Sortuj malejąco po kolumnie Pierwsza kolumna/i });
    await user.click(sortDescBtn);

    expect(window.location.search).toBe('?sort=orderFirst&dir=desc');

    const sortRemoveBtn = screen.getByRole('button', { name: /Usuń sortowanie po kolumnie Pierwsza kolumna/i });
    await user.click(sortRemoveBtn);

    expect(window.location.search).toBe('');
  });

  it('filters by status dropdown, updates URL and resets page to 1', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?page=2');

    const columnsWithStatus: NormalizedColumn[] = [
      ...mockColumns,
      {
        key: 'applicationStatus',
        label: 'Status',
        type: 'badge',
        sortable: true,
        filterable: true,
        visible: true,
        order: 15,
        sourceIndex: 4,
        options: ['approved', 'rejected'],
      },
    ];

    const rowsWithStatus: TableRow[] = [
      { id: '1', sourceIndex: 0, values: { orderFirst: 'Loan A', applicationStatus: 'approved' } },
      { id: '2', sourceIndex: 1, values: { orderFirst: 'Loan B', applicationStatus: 'rejected' } },
      { id: '3', sourceIndex: 2, values: { orderFirst: 'Loan C', applicationStatus: 'approved' } },
    ];

    render(<DataTable columns={columnsWithStatus} rows={rowsWithStatus} pageSize={2} />);

    const statusSelect = screen.getByRole('combobox', { name: /Filtruj według statusu/i });
    expect(statusSelect).toBeInTheDocument();

    await user.selectOptions(statusSelect, 'approved');

    expect(window.location.search).toContain('status=approved');
    expect(window.location.search).not.toContain('page=2');

    expect(screen.getByText('Loan A')).toBeInTheDocument();
    expect(screen.getByText('Loan C')).toBeInTheDocument();
    expect(screen.queryByText('Loan B')).not.toBeInTheDocument();
  });

  it('ignores unsupported filter and sort values from the URL', async () => {
    window.history.replaceState(
      null,
      '',
      '/?status=unknown&sort=missingColumn&dir=asc'
    );

    const columnsWithStatus: NormalizedColumn[] = [
      ...mockColumns,
      {
        key: 'applicationStatus',
        label: 'Status',
        type: 'badge',
        sortable: true,
        filterable: true,
        visible: true,
        order: 15,
        sourceIndex: 4,
        options: ['approved', 'rejected'],
      },
    ];
    const rowsWithStatus: TableRow[] = [
      { id: '1', sourceIndex: 0, values: { orderFirst: 'Loan A', applicationStatus: 'approved' } },
      { id: '2', sourceIndex: 1, values: { orderFirst: 'Loan B', applicationStatus: 'rejected' } },
    ];

    render(<DataTable columns={columnsWithStatus} rows={rowsWithStatus} />);

    expect(screen.getByRole('combobox', { name: /Filtruj według statusu/i })).toHaveValue('all');
    expect(screen.getByText('Loan A')).toBeInTheDocument();
    expect(screen.getByText('Loan B')).toBeInTheDocument();

    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('renders missing and invalid values as an em dash', () => {
    const columns: NormalizedColumn[] = [
      {
        key: 'name', label: 'Nazwa', type: 'text', sortable: false,
        filterable: false, visible: true, order: 0, sourceIndex: 0,
      },
      {
        key: 'amount', label: 'Kwota', type: 'currency', sortable: false,
        filterable: false, visible: true, order: 1, sourceIndex: 1,
      },
      {
        key: 'date', label: 'Data', type: 'date', sortable: false,
        filterable: false, visible: true, order: 2, sourceIndex: 2,
      },
    ];
    const rows: TableRow[] = [
      { id: 'missing', sourceIndex: 0, values: { name: null, amount: Number.NaN, date: 'invalid' } },
    ];

    render(<DataTable columns={columns} rows={rows} />);

    const dataRow = screen.getAllByRole('row')[1];
    expect(within(dataRow).getAllByText('—')).toHaveLength(3);
  });

  it('resets all filters, updates URL and restores full dataset on "Wyczyść filtry" click', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?q=xyzNonexistent');

    render(<DataTable columns={mockColumns} rows={mockRows} />);

    expect(screen.getByText('Brak wyników spełniających kryteria')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: 'Wyczyść filtry' });
    await user.click(resetBtn);

    expect(window.location.search).toBe('');
    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.getByText('Wartość 2A')).toBeInTheDocument();
  });

  it('synchronizes table state with browser popstate (back/forward navigation)', async () => {
    window.history.replaceState(null, '', '/');

    render(<DataTable columns={mockColumns} rows={mockRows} />);

    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.getByText('Wartość 2A')).toBeInTheDocument();

    await act(async () => {
      window.history.replaceState(null, '', '/?q=1A');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByText('Wartość 1A')).toBeInTheDocument();
    expect(screen.queryByText('Wartość 2A')).not.toBeInTheDocument();
  });
});
