import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import * as repository from '../src/services/tableRepository';

describe('App remote states and error recovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays loading state and then renders successful data', async () => {
    vi.spyOn(repository, 'fetchTableData').mockResolvedValueOnce({
      columns: [
        { key: 'loanId', label: 'ID', type: 'text' },
        { key: 'status', label: 'Status', type: 'badge', options: ['new'] },
      ],
      rows: [
        { loanId: 'LN-100', status: 'new' },
      ],
    });

    render(<App />);

    expect(screen.getByText('Wczytywanie wniosków…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('LN-100')).toBeInTheDocument();
    });

    expect(screen.queryByText('Wczytywanie wniosków…')).not.toBeInTheDocument();
  });

  it('shows source-empty state when repository returns empty rows', async () => {
    vi.spyOn(repository, 'fetchTableData').mockResolvedValueOnce({
      columns: [{ key: 'loanId', label: 'ID', type: 'text' }],
      rows: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Brak wniosków w systemie')).toBeInTheDocument();
    });
  });

  it('shows error state with retry button and recovers when retry succeeds', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(repository, 'fetchTableData');

    fetchSpy.mockRejectedValueOnce(new Error('Błąd połączenia z serwerem'));
    fetchSpy.mockResolvedValueOnce({
      columns: [{ key: 'loanId', label: 'ID', type: 'text' }],
      rows: [{ loanId: 'LN-RECOVERED' }],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Wystąpił błąd podczas ładowania danych')).toBeInTheDocument();
      expect(screen.getByText('Błąd połączenia z serwerem')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: 'Spróbuj ponownie' });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('LN-RECOVERED')).toBeInTheDocument();
    });
  });

  it('cancels in-flight request on unmount to prevent memory leaks and race conditions', async () => {
    const fetchSpy = vi.spyOn(repository, 'fetchTableData');

    const signals: AbortSignal[] = [];
    fetchSpy.mockImplementation(async ({ signal } = {}) => {
      if (signal) signals.push(signal);
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const { unmount } = render(<App />);

    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    unmount();
    expect(signals[0].aborted).toBe(true);
  });

  it('renders action notification toast and allows manual dismissal', async () => {
    const user = userEvent.setup();
    vi.spyOn(repository, 'fetchTableData').mockResolvedValueOnce({
      columns: [
        { key: 'loanId', label: 'ID', type: 'text' },
        { key: 'customerName', label: 'Klient', type: 'text' },
        { key: 'canEdit', label: 'Akcje', type: 'action', action: 'edit' },
      ],
      rows: [
        { loanId: 'LN-TOAST', customerName: 'Adam Nowak', permissions: { canEdit: true } },
      ],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LN-TOAST')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /edytuj/i });
    await user.click(editBtn);

    expect(
      screen.getByText('Wywołano akcję "edit" dla wniosku LN-TOAST (Adam Nowak).')
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Zamknij powiadomienie' });
    await user.click(closeBtn);

    expect(
      screen.queryByText('Wywołano akcję "edit" dla wniosku LN-TOAST (Adam Nowak).')
    ).not.toBeInTheDocument();
  });
});
