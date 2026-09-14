export const MISSING_VALUE_PLACEHOLDER = '—';

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return true;
  }
  return false;
}

export function formatText(value: unknown): string {
  if (isMissingValue(value)) {
    return MISSING_VALUE_PLACEHOLDER;
  }
  return String(value);
}

const defaultNumberFormatter = new Intl.NumberFormat('pl-PL');

const defaultCurrencyFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const defaultDateFormatter = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currencyCode: string): Intl.NumberFormat {
  let formatter = currencyFormatterCache.get(currencyCode);
  if (!formatter) {
    formatter = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(currencyCode, formatter);
  }
  return formatter;
}

export function formatNumber(value: unknown): string {
  if (isMissingValue(value)) {
    return MISSING_VALUE_PLACEHOLDER;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return MISSING_VALUE_PLACEHOLDER;
  }
  return defaultNumberFormatter.format(num);
}

export function formatCurrency(value: unknown, currencyCode?: string): string {
  if (isMissingValue(value)) {
    return MISSING_VALUE_PLACEHOLDER;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return MISSING_VALUE_PLACEHOLDER;
  }

  if (currencyCode) {
    try {
      return getCurrencyFormatter(currencyCode).format(num);
    } catch {
      // Ignore invalid currency code and fall back to default currency format
    }
  }

  return defaultCurrencyFormatter.format(num);
}

export function formatDate(value: unknown): string {
  if (isMissingValue(value)) {
    return MISSING_VALUE_PLACEHOLDER;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return MISSING_VALUE_PLACEHOLDER;
  }

  return defaultDateFormatter.format(date);
}

export interface StatusMeta {
  label: string;
  variant: 'new' | 'in_review' | 'approved' | 'rejected' | 'default';
}

const STATUS_MAP: Record<string, StatusMeta> = {
  new: { label: 'Nowy', variant: 'new' },
  in_review: { label: 'W weryfikacji', variant: 'in_review' },
  approved: { label: 'Zatwierdzony', variant: 'approved' },
  rejected: { label: 'Odrzucony', variant: 'rejected' },
};

export function formatStatus(status: unknown): StatusMeta | null {
  if (isMissingValue(status)) {
    return null;
  }

  const rawKey = String(status).trim().toLowerCase();
  if (STATUS_MAP[rawKey]) {
    return STATUS_MAP[rawKey];
  }

  const readable = rawKey.replace(/_/g, ' ');
  const capitalized = readable.charAt(0).toUpperCase() + readable.slice(1);

  return {
    label: capitalized,
    variant: 'default',
  };
}
