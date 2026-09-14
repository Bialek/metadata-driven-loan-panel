import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  readTableStateFromUrl,
  writeTableStateToUrl,
  useTableUrlSync,
} from '../src/hooks/useTableUrlSync';
import type { SortState, FilterState } from '../src/types/table';

describe('useTableUrlSync module', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readTableStateFromUrl', () => {
    it('returns default state when no search params are present', () => {
      window.history.replaceState(null, '', '/');
      const state = readTableStateFromUrl();
      expect(state).toEqual({
        query: '',
        status: '',
        sort: null,
        page: 1,
      });
    });

    it('parses valid search query, status, sort and page parameters', () => {
      window.history.replaceState(
        null,
        '',
        '/?q=Jan&status=approved&sort=monthlyRate&dir=desc&page=4'
      );
      const state = readTableStateFromUrl();
      expect(state).toEqual({
        query: 'Jan',
        status: 'approved',
        sort: { key: 'monthlyRate', direction: 'desc' },
        page: 4,
      });
    });

    it('properly decodes special characters and Polish diacritics in query', () => {
      window.history.replaceState(
        null,
        '',
        '/?q=%C5%81ukasz%20Wo%C5%BAniak'
      );
      const state = readTableStateFromUrl();
      expect(state.query).toBe('Łukasz Woźniak');
    });

    it('sanitizes invalid page parameter (0, negative, non-numeric) to page 1', () => {
      window.history.replaceState(null, '', '/?page=0');
      expect(readTableStateFromUrl().page).toBe(1);

      window.history.replaceState(null, '', '/?page=-5');
      expect(readTableStateFromUrl().page).toBe(1);

      window.history.replaceState(null, '', '/?page=invalid');
      expect(readTableStateFromUrl().page).toBe(1);
    });

    it('rejects invalid sort direction and returns sort as null', () => {
      window.history.replaceState(null, '', '/?sort=loanId&dir=diagonal');
      expect(readTableStateFromUrl().sort).toBeNull();

      window.history.replaceState(null, '', '/?sort=loanId');
      expect(readTableStateFromUrl().sort).toBeNull();

      window.history.replaceState(null, '', '/?dir=asc');
      expect(readTableStateFromUrl().sort).toBeNull();
    });
  });

  describe('writeTableStateToUrl', () => {
    it('writes full state to URL using pushState when mode is push', () => {
      const pushStateSpy = vi.spyOn(window.history, 'pushState');

      writeTableStateToUrl(
        {
          query: 'Kowalski',
          status: 'new',
          sort: { key: 'customerName', direction: 'asc' },
          page: 2,
        },
        'push'
      );

      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      expect(window.location.search).toBe(
        '?q=Kowalski&status=new&sort=customerName&dir=asc&page=2'
      );
    });

    it('writes state to URL using replaceState when mode is replace', () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

      writeTableStateToUrl(
        {
          query: 'Anna',
          status: 'approved',
          sort: null,
          page: 1,
        },
        'replace'
      );

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      expect(window.location.search).toBe('?q=Anna&status=approved');
    });

    it('omits default values (empty query, status all/empty, sort null, page 1) from search params', () => {
      window.history.replaceState(null, '', '/?q=old&page=3');

      writeTableStateToUrl(
        {
          query: '   ',
          status: 'all',
          sort: null,
          page: 1,
        },
        'replace'
      );

      expect(window.location.search).toBe('');
    });

    it('does not call history API if target URL matches current window.location.search', () => {
      window.history.replaceState(null, '', '/?q=test');
      const replaceSpy = vi.spyOn(window.history, 'replaceState');
      const pushSpy = vi.spyOn(window.history, 'pushState');

      writeTableStateToUrl({
        query: 'test',
        sort: null,
        page: 1,
      });

      expect(replaceSpy).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });
  });

  describe('useTableUrlSync hook', () => {
    it('subscribes to window popstate and invokes onSyncFromUrl on browser navigation', () => {
      const onSyncFromUrl = vi.fn();
      const filterState: FilterState = { query: '', selections: {} };
      const sortState: SortState | null = null;

      const { unmount } = renderHook(() =>
        useTableUrlSync({
          filterState,
          sortState,
          currentPage: 1,
          onSyncFromUrl,
        })
      );

      window.history.replaceState(null, '', '/?q=backSearch&status=in_review&page=3');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(onSyncFromUrl).toHaveBeenCalledTimes(1);
      expect(onSyncFromUrl).toHaveBeenCalledWith({
        query: 'backSearch',
        status: 'in_review',
        sort: null,
        page: 3,
      });

      unmount();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onSyncFromUrl).toHaveBeenCalledTimes(1);
    });
  });
});
