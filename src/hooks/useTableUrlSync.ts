import { useEffect } from 'react';
import type { SortState, FilterState } from '../types/table';

export interface UrlTableState {
  query: string;
  status: string;
  sort: SortState | null;
  page: number;
}

export function readTableStateFromUrl(): UrlTableState {
  if (typeof window === 'undefined') {
    return { query: '', status: '', sort: null, page: 1 };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const status = params.get('status') || '';
    const sortKey = params.get('sort');
    const sortDir = params.get('dir');
    const sort: SortState | null =
      sortKey && (sortDir === 'asc' || sortDir === 'desc')
        ? { key: sortKey, direction: sortDir }
        : null;
    const rawPage = parseInt(params.get('page') || '1', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    return { query, status, sort, page };
  } catch {
    return { query: '', status: '', sort: null, page: 1 };
  }
}

export function writeTableStateToUrl(
  state: {
    query: string;
    status?: string;
    sort: SortState | null;
    page: number;
  },
  mode: 'push' | 'replace' = 'replace'
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const params = new URLSearchParams();
    if (state.query && state.query.trim()) {
      params.set('q', state.query.trim());
    }
    if (state.status && state.status !== 'all' && state.status.trim() !== '') {
      params.set('status', state.status);
    }
    if (state.sort) {
      params.set('sort', state.sort.key);
      params.set('dir', state.sort.direction);
    }
    if (state.page > 1) {
      params.set('page', String(state.page));
    }

    const newSearch = params.toString();
    const targetSearch = newSearch ? `?${newSearch}` : '';

    if (window.location.search !== targetSearch) {
      const url = new URL(window.location.href);
      url.search = targetSearch;
      const targetUrl = url.toString();

      if (mode === 'push') {
        window.history.pushState(null, '', targetUrl);
      } else {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  } catch {
    // History API restricted environment fallback
  }
}

interface UseTableUrlSyncOptions {
  filterState: FilterState;
  sortState: SortState | null;
  currentPage: number;
  onSyncFromUrl: (state: UrlTableState) => void;
  statusKey?: string;
}

export function useTableUrlSync({
  filterState,
  sortState,
  currentPage,
  onSyncFromUrl,
  statusKey,
}: UseTableUrlSyncOptions): void {
  useEffect(() => {
    writeTableStateToUrl({
      query: filterState.query,
      status: statusKey ? filterState.selections[statusKey] : undefined,
      sort: sortState,
      page: currentPage,
    });
  }, [filterState.query, filterState.selections, sortState, currentPage, statusKey]);

  useEffect(() => {
    const handlePopState = () => {
      const urlState = readTableStateFromUrl();
      onSyncFromUrl(urlState);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onSyncFromUrl]);
}
